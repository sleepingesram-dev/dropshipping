import { config } from '../config.js';
import * as mock from '../mock/seed.js';
import { round2 } from '../mock/random.js';

// ── TikTok Marketing API ──────────────────────────────────────────────────
async function tiktokReport(params) {
  const url = new URL('https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/');
  url.searchParams.set('advertiser_id', config.tiktok.advertiserId);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  const res = await fetch(url, { headers: { 'Access-Token': config.tiktok.token } });
  const body = await res.json();
  if (body.code !== 0) throw new Error(`TikTok API: ${body.message}`);
  return body.data;
}

// ── Meta Marketing API ────────────────────────────────────────────────────
async function metaInsights(params) {
  const url = new URL(`https://graph.facebook.com/v19.0/act_${config.meta.adAccountId}/insights`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('access_token', config.meta.token);
  const res = await fetch(url);
  const body = await res.json();
  if (body.error) throw new Error(`Meta API: ${body.error.message}`);
  return body.data;
}

function normalizeDay(raw) {
  const spend = Number(raw.spend ?? 0);
  const revenue = Number(raw.revenue ?? 0);
  const purchases = Number(raw.purchases ?? 0);
  const impressions = Number(raw.impressions ?? 0);
  const clicks = Number(raw.clicks ?? 0);
  return {
    date: raw.date, spend: round2(spend), impressions, clicks, purchases,
    revenue: round2(revenue),
    roas: spend > 0 ? round2(revenue / spend) : 0,
    cpp: purchases > 0 ? round2(spend / purchases) : 0,
    ctr: impressions > 0 ? round2((clicks / impressions) * 100) : 0,
  };
}

export const adsPlatforms = {
  modes() {
    return { tiktok: config.tiktok.mode, meta: config.meta.mode, google: 'mock' };
  },

  async listCampaigns() {
    // Live mode merges per-platform campaign lists; mock returns the seeded
    // set. Google Ads OAuth flow lands with the Merchant Center step, so its
    // campaigns stay mock until then.
    return mock.CAMPAIGNS.map(({ arc, ...c }) => c);
  },

  async campaignSeries(campaignId, days = 14) {
    const campaign = mock.CAMPAIGNS.find((c) => c.id === campaignId);
    if (!campaign) return null;

    if (campaign.platform === 'tiktok' && config.tiktok.mode === 'live') {
      const end = new Date().toISOString().slice(0, 10);
      const start = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const data = await tiktokReport({
        report_type: 'BASIC', data_level: 'AUCTION_CAMPAIGN',
        dimensions: ['campaign_id', 'stat_time_day'],
        metrics: ['spend', 'impressions', 'clicks', 'complete_payment', 'total_complete_payment_rate'],
        start_date: start, end_date: end,
        filtering: [{ field_name: 'campaign_ids', filter_type: 'IN', filter_value: JSON.stringify([campaignId]) }],
      });
      return data.list.map((r) => normalizeDay({
        date: r.dimensions.stat_time_day.slice(0, 10), spend: r.metrics.spend,
        impressions: r.metrics.impressions, clicks: r.metrics.clicks,
        purchases: r.metrics.complete_payment, revenue: r.metrics.total_complete_payment_rate,
      }));
    }

    if (campaign.platform === 'meta' && config.meta.mode === 'live') {
      const data = await metaInsights({
        level: 'campaign', time_increment: '1',
        date_preset: days <= 7 ? 'last_7d' : 'last_30d',
        fields: 'campaign_id,spend,impressions,clicks,actions,action_values',
        filtering: JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: [campaignId] }]),
      });
      return data.map((r) => normalizeDay({
        date: r.date_start, spend: r.spend, impressions: r.impressions, clicks: r.clicks,
        purchases: r.actions?.find((a) => a.action_type === 'purchase')?.value ?? 0,
        revenue: r.action_values?.find((a) => a.action_type === 'purchase')?.value ?? 0,
      }));
    }

    return mock.campaignSeries(campaign, days);
  },

  async listCreatives() {
    return mock.CREATIVES;
  },

  // Today's pacing per active campaign: budget, spend so far, day elapsed.
  async spendPacing() {
    const dayElapsed = Math.min(1, (new Date().getHours() * 60 + new Date().getMinutes()) / 1440);
    const rows = [];
    for (const c of mock.CAMPAIGNS.filter((x) => x.status === 'active')) {
      const series = await this.campaignSeries(c.id, 1);
      const today = series?.[series.length - 1];
      rows.push({
        campaignId: c.id, name: c.name, platform: c.platform,
        dailyBudget: c.dailyBudget, spendToday: today?.spend ?? 0,
        budgetUsed: round2(((today?.spend ?? 0) / c.dailyBudget) * 100),
        dayElapsed: round2(dayElapsed * 100),
      });
    }
    return rows;
  },
};

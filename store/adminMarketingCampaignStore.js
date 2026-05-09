import { create } from "zustand";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const MARKETING_API = `${API_URL}/api/marketing-campaigns`;

const getCampaignKey = (campaign) => campaign?.slug || campaign?._id;

export const useAdminMarketingCampaignStore = create((set, get) => ({
  campaigns: [],
  selectedCampaign: null,
  stats: null,

  isLoading: false,
  isDetailsLoading: false,
  isCreating: false,
  isCreatingLink: false,
  isTrackingJourney: false,
  isTrackingConversion: false,

  error: null,
  successMessage: null,

  clearMessages: () =>
    set({
      error: null,
      successMessage: null,
    }),

  fetchCampaigns: async () => {
    try {
      set({
        isLoading: true,
        error: null,
      });

      const { data } = await axios.get(MARKETING_API);

      set({
        campaigns: data?.campaigns || [],
        isLoading: false,
      });

      return data;
    } catch (error) {
      set({
        isLoading: false,
        error:
          error?.response?.data?.message ||
          "Failed to fetch marketing campaigns",
      });

      throw error;
    }
  },

  fetchCampaignDetails: async (campaignIdOrSlug) => {
    try {
      set({
        isDetailsLoading: true,
        error: null,
        selectedCampaign: null,
        stats: null,
      });

      const { data } = await axios.get(
        `${MARKETING_API}/${campaignIdOrSlug}`
      );

      set({
        selectedCampaign: data?.campaign || null,
        stats: data?.stats || null,
        isDetailsLoading: false,
      });

      return data;
    } catch (error) {
      set({
        isDetailsLoading: false,
        error:
          error?.response?.data?.message ||
          "Failed to fetch campaign details",
      });

      throw error;
    }
  },

  fetchCampaignDetailsBySlug: async (campaignSlug) => {
    return get().fetchCampaignDetails(campaignSlug);
  },

  createCampaign: async (payload = {}) => {
    try {
      set({
        isCreating: true,
        error: null,
        successMessage: null,
      });

      const { data } = await axios.post(MARKETING_API, {
        name: payload.name,
        description: payload.description || "",
        status: payload.status || "draft",
      });

      const createdCampaign = data?.campaign;

      set({
        campaigns: createdCampaign
          ? [createdCampaign, ...get().campaigns]
          : get().campaigns,
        isCreating: false,
        successMessage: "Campaign created successfully",
      });

      return data;
    } catch (error) {
      set({
        isCreating: false,
        error:
          error?.response?.data?.message ||
          "Failed to create marketing campaign",
      });

      throw error;
    }
  },

  createTrackingLink: async (campaignIdOrSlug, payload = {}) => {
    try {
      set({
        isCreatingLink: true,
        error: null,
        successMessage: null,
      });

      const { data } = await axios.post(
        `${MARKETING_API}/${campaignIdOrSlug}/link`,
        {
          destinationUrl: payload.destinationUrl,
          customerId: payload.customerId || undefined,
          phone: payload.phone || "",
          name: payload.name || "",
        }
      );

      set({
        isCreatingLink: false,
        successMessage: "Tracking link created successfully",
      });

      await get().fetchCampaignDetails(campaignIdOrSlug);
      await get().fetchCampaigns();

      return data;
    } catch (error) {
      set({
        isCreatingLink: false,
        error:
          error?.response?.data?.message || "Failed to create tracking link",
      });

      throw error;
    }
  },

  trackJourneyEvent: async (payload = {}) => {
    try {
      set({
        isTrackingJourney: true,
        error: null,
      });

      const { data } = await axios.post(`${MARKETING_API}/journey/track`, {
        campaignId: payload.campaignId,
        marketingLinkId: payload.marketingLinkId,
        shortCode: payload.shortCode,

        event: payload.event,
        pageUrl: payload.pageUrl,

        productId: payload.productId,
        productName: payload.productName,

        cartValue: payload.cartValue,
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        revenue: payload.revenue,
      });

      set({
        isTrackingJourney: false,
      });

      return data;
    } catch (error) {
      set({
        isTrackingJourney: false,
        error:
          error?.response?.data?.message ||
          "Failed to track campaign journey",
      });

      throw error;
    }
  },

  markConversion: async (payload = {}) => {
    try {
      set({
        isTrackingConversion: true,
        error: null,
      });

      const { data } = await axios.post(`${MARKETING_API}/conversion/track`, {
        campaignId: payload.campaignId,
        marketingLinkId: payload.marketingLinkId,
        shortCode: payload.shortCode,
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        revenue: payload.revenue,
      });

      set({
        isTrackingConversion: false,
      });

      return data;
    } catch (error) {
      set({
        isTrackingConversion: false,
        error:
          error?.response?.data?.message ||
          "Failed to track campaign conversion",
      });

      throw error;
    }
  },

  getCampaignKey,

  getCampaignByIdFromState: (campaignIdOrSlug) => {
    return (
      get().campaigns.find(
        (item) =>
          item._id === campaignIdOrSlug ||
          item.slug === campaignIdOrSlug
      ) || null
    );
  },

  resetSelectedCampaign: () =>
    set({
      selectedCampaign: null,
      stats: null,
    }),

  resetMarketingCampaignStore: () =>
    set({
      campaigns: [],
      selectedCampaign: null,
      stats: null,

      isLoading: false,
      isDetailsLoading: false,
      isCreating: false,
      isCreatingLink: false,
      isTrackingJourney: false,
      isTrackingConversion: false,

      error: null,
      successMessage: null,
    }),
}));
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Custom base query that handles token errors
const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/`,
  prepareHeaders: headers => {
    // Get token from localStorage or state
    const token = localStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);

  // If we get a 401/403 error, clear the token
  if (result.error && (result.error.status === 401 || result.error.status === 403)) {
    localStorage.removeItem('token');
    localStorage.removeItem('userProfile');
  }

  // If we get a 404 or network error, show a more user-friendly message
  if (result.error && (result.error.status === 404 || result.error.status === 'FETCH_ERROR')) {
    return {
      ...result,
      error: {
        ...result.error,
        data: 'Backend service is not available. Please check if the server is running.',
      },
    };
  }

  return result;
};

export interface BeatType {
  id: number;
  name: string;
  genre: string;
  bpm: number;
  scale: string;
  cover_art: string;
  snippet_mp3: string;
  mp3_file: string | null;
  mp3_price: string | null;
  wav_file: string | null;
  wav_price: string | null;
  stems_file: string | null;
  stems_price: string | null;
  price: string;
}

export interface CreatePaymentIntentRequest {
  beatId: number;
  downloadType: 'mp3' | 'wav' | 'stems';
  pricePaid: number;
}

export interface CreatePaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  purchase_id: number;
}

export interface PurchaseRequest {
  beatId: number;
  downloadType: 'mp3' | 'wav' | 'stems';
  pricePaid: number;
  paymentMethod: string;
}

export interface PurchaseResponse {
  message: string;
  download_url: string;
  purchase_id: number;
}

export interface ConfirmPaymentRequest {
  beatId: number;
  paymentIntentId: string;
}

export interface ConfirmPaymentResponse {
  message: string;
  purchase_id: number;
  download_type: string;
}

export const beatApi = createApi({
  reducerPath: 'beatApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Beat'],
  endpoints: builder => ({
    getBeats: builder.query<BeatType[], void>({
      query: () => 'beats/',
    }),
    createPaymentIntent: builder.mutation<CreatePaymentIntentResponse, CreatePaymentIntentRequest>({
      query: ({ beatId, downloadType, pricePaid }) => ({
        url: `beats/${beatId}/create_payment_intent/`,
        method: 'POST',
        body: {
          download_type: downloadType,
          price_paid: pricePaid,
        },
      }),
    }),
    purchaseBeat: builder.mutation<PurchaseResponse, PurchaseRequest>({
      query: ({ beatId, downloadType, pricePaid, paymentMethod }) => ({
        url: `beats/${beatId}/purchase/`,
        method: 'POST',
        body: {
          download_type: downloadType,
          price_paid: pricePaid,
          payment_method: paymentMethod,
        },
      }),
    }),
    downloadBeat: builder.mutation<Blob, { beatId: number; downloadType: string }>({
      query: ({ beatId, downloadType }) => ({
        url: `beats/${beatId}/download/?type=${downloadType}`,
        method: 'GET',
        responseHandler: (response: Response) => response.blob(),
      }),
    }),
    confirmPayment: builder.mutation<ConfirmPaymentResponse, ConfirmPaymentRequest>({
      query: ({ beatId, paymentIntentId }) => ({
        url: `beats/${beatId}/confirm_payment/`,
        method: 'POST',
        body: {
          payment_intent_id: paymentIntentId,
        },
      }),
    }),
  }),
});

export const {
  useGetBeatsQuery,
  useCreatePaymentIntentMutation,
  usePurchaseBeatMutation,
  useDownloadBeatMutation,
  useConfirmPaymentMutation,
} = beatApi;

export type EnquiryStatus =
  | 'new'
  | 'contacted'
  | 'inspection_scheduled'
  | 'closed'
  | 'not_interested';

export type Enquiry = {
  id: string;
  listing_id: string;
  agent_id: string;
  enquirer_name: string;
  enquirer_phone: string;
  enquirer_email: string | null;
  message: string | null;
  preferred_inspection_date: string | null;
  status: EnquiryStatus;
  created_at: string;
  // joined listing context
  listing_title: string | null;
  listing_price: number | null;
  listing_payment_frequency: string | null;
  listing_area: string | null;
  listing_state: string | null;
  listing_cover_photo: string | null;
  // agency-admin view only
  listing_agent_name: string | null;
};

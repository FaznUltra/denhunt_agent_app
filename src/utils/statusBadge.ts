import { colors } from '@/constants/colors';
import type { ListingStatus } from '@/types/listings';
import type { EnquiryStatus } from '@/types/enquiries';

export type StatusBadgeStyle = { bg: string; text: string; label: string };

// Shared 7-status badge styling for listings (Badge only models 4 statuses).
// Used by ListingRowCard and the listing detail screen.
const STATUS_BADGE: Record<ListingStatus, StatusBadgeStyle> = {
  active: { bg: colors.blue50, text: colors.blue600, label: 'Active' },
  pending_review: { bg: colors.warningBg, text: colors.warningText, label: 'Pending' },
  draft: { bg: colors.gray100, text: colors.gray500, label: 'Draft' },
  paused: { bg: colors.gray100, text: colors.gray500, label: 'Paused' },
  rented_sold: { bg: colors.successBg, text: colors.successText, label: 'Sold/Rented' },
  rejected: { bg: colors.errorBg, text: colors.errorText, label: 'Rejected' },
  expired: { bg: colors.gray100, text: colors.gray500, label: 'Expired' },
};

export function getStatusBadgeStyle(status: ListingStatus): StatusBadgeStyle {
  return STATUS_BADGE[status] ?? STATUS_BADGE.draft;
}

const ENQUIRY_BADGE: Record<EnquiryStatus, StatusBadgeStyle> = {
  new: { bg: colors.blue50, text: colors.blue600, label: 'New' },
  contacted: { bg: colors.warningBg, text: colors.warningText, label: 'Contacted' },
  inspection_scheduled: { bg: colors.successBg, text: colors.successText, label: 'Inspection set' },
  closed: { bg: colors.gray50, text: colors.gray500, label: 'Closed' },
  not_interested: { bg: colors.errorBg, text: colors.errorText, label: 'Not interested' },
};

export function getEnquiryStatusBadge(status: EnquiryStatus): StatusBadgeStyle {
  return ENQUIRY_BADGE[status] ?? ENQUIRY_BADGE.new;
}

// Colour dot per enquiry status (for the status picker rows).
export const ENQUIRY_DOT: Record<EnquiryStatus, string> = {
  new: colors.blue600,
  contacted: colors.warningText,
  inspection_scheduled: colors.successText,
  closed: colors.gray500,
  not_interested: colors.errorText,
};

import { Text } from 'react-native';
import { type } from '@/constants/typography';

export interface SectionLabelProps {
  text: string;
}

// SectionLabel — uppercase section label. See docs/denhunt-design-system.md.
export function SectionLabel({ text }: SectionLabelProps) {
  return <Text style={type.label}>{text}</Text>;
}

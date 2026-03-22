import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input/Input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar = ({ value, onChange }: SearchBarProps) => {
  return (
    <Input
      icon={<Search size={16} />}
      placeholder="북마크 검색..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputSize="lg"
    />
  );
};

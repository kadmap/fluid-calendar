import { useSettingsStore } from "@/store/settings";
import { SettingsSection, SettingRow } from "./SettingsSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CalendarSettings() {
  const { user, updateUserSettings } =
    useSettingsStore();

  return (
    <SettingsSection
      title="Calendar Settings"
      description="Configure your calendar display and event defaults."
    >
      <SettingRow
        label="Week Start Day"
        description="Set which day of the week your calendar should start on"
      >
        <Select
          value={user.weekStartDay}
          onValueChange={(value) =>
            updateUserSettings({
              weekStartDay: value as "monday" | "sunday",
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select start day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sunday">Sunday</SelectItem>
            <SelectItem value="monday">Monday</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </SettingsSection>
  );
}

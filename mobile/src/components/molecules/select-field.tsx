import { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, Pressable, Text, VStack } from '@/components/atoms';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

import { SearchField } from './search-field';

export type SelectOption = {
  label: string;
  value: string;
  description?: string;
  /** Options sharing a group are listed under one heading, in first-seen order. */
  group?: string;
};

type SelectFieldProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  disabledValues?: string[];
  placeholder?: string;
  /** Show a search box above the list. Worth it past a dozen or so options. */
  searchable?: boolean;
};

/**
 * A native-feeling select: a field that opens a sheet of choices.
 *
 * A sheet rather than a picker wheel because choices here carry descriptions and groups
 * (Char Dham, pilgrimage places, districts), which a wheel cannot show.
 */
export function SelectField({
  label,
  value,
  options,
  onSelect,
  disabledValues = [],
  placeholder,
  searchable = false,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const theme = useTheme();
  const t = useT();

  const selected = options.find((option) => option.value === value);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? options.filter(
          (option) =>
            option.label.toLowerCase().includes(needle) ||
            option.description?.toLowerCase().includes(needle)
        )
      : options;
    const byGroup = new Map<string, SelectOption[]>();
    for (const option of matching) {
      const key = option.group ?? '';
      byGroup.set(key, [...(byGroup.get(key) ?? []), option]);
    }
    return [...byGroup.entries()];
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <VStack gap="xs">
        <Text variant="footnote" color="textMuted">
          {label}
        </Text>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityLabel={`${label}: ${selected?.label ?? t('compare.select')}`}
          accessibilityHint={t('compare.choicesHint')}
          accessibilityState={{ expanded: open }}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text
            variant="bodyStrong"
            color={selected ? 'text' : 'textMuted'}
            style={{ flex: 1 }}
            numberOfLines={1}
          >
            {selected ? selected.label : (placeholder ?? t('compare.select'))}
          </Text>
          <Icon name="chevron-down" size={16} tone="textMuted" />
        </Pressable>
      </VStack>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        onRequestClose={close}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View
            style={{
              padding: theme.spacing.md,
              paddingHorizontal: theme.spacing.xl,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text variant="heading">{label}</Text>
            <Pressable
              onPress={close}
              accessibilityLabel={t('compare.closeChoices', { label })}
            >
              <Icon name="close" size={24} tone="text" />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {searchable ? (
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder={t('select.search')}
                accessibilityLabel={t('select.search')}
                clearLabel={t('districts.clearSearch')}
              />
            ) : null}
            {groups.length === 0 ? (
              <Text variant="body" color="textMuted">
                {t('select.noMatch')}
              </Text>
            ) : null}
            {groups.map(([group, groupOptions]) => (
              <VStack key={group || 'all'} gap="sm">
                {group ? (
                  <Text variant="footnote" color="textMuted" weight="semibold">
                    {group.toUpperCase()}
                  </Text>
                ) : null}
                {groupOptions.map((option) => {
                  const isSelected = option.value === value;
                  const isDisabled = disabledValues.includes(option.value);
                  return (
                    <Pressable
                      key={`${group}-${option.value}`}
                      onPress={() => {
                        onSelect(option.value);
                        close();
                      }}
                      disabled={isDisabled}
                      accessibilityRole="radio"
                      accessibilityLabel={option.label}
                      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                      style={{
                        padding: theme.spacing.lg,
                        backgroundColor: isSelected
                          ? theme.colors.primaryMuted
                          : theme.colors.surface,
                        borderRadius: theme.radius.lg,
                        borderWidth: 1,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        opacity: isDisabled ? 0.45 : 1,
                      }}
                    >
                      <VStack gap="xs" style={{ flex: 1 }}>
                        <Text variant="bodyStrong" color={isSelected ? 'primary' : 'text'}>
                          {option.label}
                        </Text>
                        {option.description ? (
                          <Text variant="caption" color="textMuted">
                            {option.description}
                          </Text>
                        ) : null}
                      </VStack>
                      {isSelected ? (
                        <Icon name="checkmark-circle" size={24} tone="primary" />
                      ) : null}
                    </Pressable>
                  );
                })}
              </VStack>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

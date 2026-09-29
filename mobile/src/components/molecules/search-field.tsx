import { TextInput, View } from 'react-native';

import { Icon, Pressable } from '@/components/atoms';
import { HIT_SLOP_MIN_SIZE, useTheme } from '@/theme';
import { familyFor, platformTextFixes } from '@/theme/fonts';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  clearLabel: string;
};

/**
 * A search box with an app-drawn clear button (`clearButtonMode` is iOS-only) and the font
 * named explicitly - a raw TextInput is the one place the Text atom cannot pin it.
 */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  clearLabel,
}: SearchFieldProps) {
  const theme = useTheme();
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel}
        // Capped like the body text step; uncapped, the largest Android font sizes overflow
        // the fixed 48dp field.
        maxFontSizeMultiplier={theme.typography.body.maxFontScale}
        cursorColor={theme.colors.primary}
        selectionColor={theme.colors.primary}
        style={{
          height: 48,
          paddingLeft: theme.spacing.md,
          paddingRight: value ? HIT_SLOP_MIN_SIZE : theme.spacing.md,
          paddingVertical: 0,
          textAlignVertical: 'center',
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          color: theme.colors.text,
          fontFamily: familyFor(value, 'regular'),
          fontSize: theme.typography.body.fontSize,
          ...platformTextFixes(value),
        }}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityLabel={clearLabel}
          style={{
            position: 'absolute',
            right: 0,
            width: HIT_SLOP_MIN_SIZE,
            height: HIT_SLOP_MIN_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="close-circle" size={18} tone="textMuted" />
        </Pressable>
      ) : null}
    </View>
  );
}

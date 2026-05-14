import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, spacing, text } from '../utils/theme';
import { logger } from '../services/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('React render error', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xl,
          }}
        >
          <Text style={[text.h2, { marginBottom: spacing.md }]}>Something went wrong</Text>
          <Text style={[text.muted, { marginBottom: spacing.xl, textAlign: 'center' }]}>
            {this.state.error.message}
          </Text>
          <Pressable
            onPress={() => this.setState({ error: null })}
            style={{
              backgroundColor: colors.primary,
              paddingVertical: spacing.lg,
              paddingHorizontal: spacing.xl,
              borderRadius: 12,
            }}
          >
            <Text style={text.cta}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

import {
  baseTheme,
  extendTheme,
  withDefaultColorScheme,
} from "@chakra-ui/react";

const customTheme = extendTheme(
  {
    colors: {
      primary: baseTheme.colors.green,
    },
  },
  withDefaultColorScheme({ colorScheme: "primary" })
);

export default customTheme;

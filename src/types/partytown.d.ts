declare module "@builder.io/partytown/react" {
  import type { FC } from "react";
  interface PartytownProps {
    forward?: string[];
    debug?: boolean;
    lib?: string;
  }
  export const Partytown: FC<PartytownProps>;
}

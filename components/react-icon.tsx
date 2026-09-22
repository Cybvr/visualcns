import { createElement, type ComponentType } from "react"
import type { IconBaseProps, IconType } from "react-icons"

type ReactIconProps = IconBaseProps & {
  icon: IconType
}

/** Adapts react-icons' ReactNode return type to React 19's JSX component type. */
export function ReactIcon({ icon, ...props }: ReactIconProps): React.JSX.Element {
  return createElement(icon as unknown as ComponentType<IconBaseProps>, props)
}

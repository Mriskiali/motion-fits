/* eslint-disable */

// @eslint-ignore-file
// @ts-nocheck
import { cloneElement, PropsWithChildren, useContext } from "react";
import { EditableContext } from "./withEditableWrapper_";
import { Platform } from "react-native";

export type ElementTypes = "Text" | "View";

const isPrimitive = (item: any) => {
  if (Array.isArray(item)) return item.every((el) => isPrimitive(el));
  if (typeof item === "object")
    Object.values(item).every((el) => isPrimitive(el));
  if (typeof item === "string") return true;
  if (typeof item === "number") return true;

  return false;
};

export const getType = (el: any): ElementTypes | undefined => {
  if (el?.type?.render?.displayName === "Text") return "Text";
  if (el?.type?.render?.displayName === "View") return "View";
  if (el?.type?.name === "Icon") return "Icon";
  if (el?.type?.type?.displayName === "TouchableOpacity")
    return "TouchableOpacity";

  return undefined;
};

const toArray = (object: T | T[]): T[] => {
  if (Array.isArray(object)) return object;
  return [object];
};

export default function EditableElement_(_props: PropsWithChildren<any>) {
  const {
    editModeEnabled,
    selected,
    onElementClick,
    attributes: overwrittenProps,
    hovered,
    pushHovered,
    popHovered,
  } = useContext(EditableContext);

  const { children } = _props;
  const { props } = children;

  // If we are not running in the web the windows will causes
  // issues hence editable mode is not enabled.
  if (Platform.OS !== "web") {
    return cloneElement(children, props);
  }

  const type = getType(children);
  const __sourceLocation = props.__sourceLocation;
  const __trace = props.__trace;
  const id = __trace.join("");
  const attributes = overwrittenProps[id] ?? {};

  const editStyling =
    selected === id
      ? {
          outline: "1px solid blue",
        }
      : hovered === id
      ? {
          outline: "1px dashed blue",
        }
      : {};

  const onClick = (ev: any) => {
    ev.stopPropagation();
    ev.preventDefault();
    onElementClick({
      sourceLocation: __sourceLocation,
      id,
      type,
      trace: __trace,
      props: {
        style: { ...props.style },
        children: isPrimitive(props.children) ? props.children : undefined,
      },
    });
  };

  const editProps = {
    onMouseOver: () => pushHovered(id),
    onMouseLeave: () => popHovered(id),
    onClick: (ev) => onClick(ev),
    onPress: (ev) => onClick(ev),
  };

  if (type === "Text") {
    if (!editModeEnabled) return children;

    return cloneElement(children, {
      ...editProps,
      ...props,
      style: [...toArray(props.style), editStyling, attributes.style ?? {}],
      children: attributes.children ?? children.props.children,
    });
  }

  if (type === "View") {
    if (!editModeEnabled) return children;

    return cloneElement(children, {
      ...props,
      ...editProps,
      style: [...toArray(props.style), editStyling, attributes.style ?? {}],
      children: children.props.children,
    });
  }

  if (type === "TouchableOpacity") {
    if (!editModeEnabled) return children;

    return cloneElement(children, {
      ...props,
      ...editProps,
      style: [...toArray(props.style), editStyling, attributes.style ?? {}],
      children: children.props.children,
    });
  }

  if (type === "Icon") {
    if (!editModeEnabled) return children;

    return cloneElement(children, {
      ...props,
      ...editProps,
      style: [...toArray(props.style), editStyling, attributes.style ?? {}],
      children: children.props.children,
    });
  }
}

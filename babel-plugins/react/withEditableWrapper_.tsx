/* eslint-disable */

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from "react";
import { ElementTypes } from "./EditableElement_";
import { Platform } from "react-native";

type ElementProps = {
  type: ElementTypes;
  sourceLocation: string;
  attributes: any;
  id: string;
};

type EditableContextType = {
  onElementClick: (props: ElementProps) => void;
  editModeEnabled: boolean;
  attributes: Record<string, any>;
  selected: string | undefined;
  setSelected: (hovered: string | undefined) => void;
  hovered: string | undefined;
  pushHovered: (hovered: string) => void;
  popHovered: (hovered: string) => void;
};

export const EditableContext = createContext<EditableContextType>({} as any);

const EditablePage = (props: PropsWithChildren) => {
  const { children } = props;
  const [haveBooted, setHaveBooted] = useState<boolean>(false);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [hoveredStack, setHoveredStack] = useState<string[]>([]);
  const [origin, setOrigin] = useState<string | null>(null);
  const [overwrittenProps, setOvewrittenProps] = useState<Record<string, {}>>(
    {}
  );

  useEffect(() => {
    if (!haveBooted) {
      setHaveBooted(true);
      window.addEventListener("message", (event) => {
        const { type, data } = event.data ?? {};
        switch (type) {
          case "element_editor_enable": {
            setEditModeEnabled(true);
            break;
          }
          case "element_editor_disable": {
            setEditModeEnabled(false);
            break;
          }
          case "override_props": {
            setOvewrittenProps((overwrittenProps) => {
              return {
                ...overwrittenProps,
                [data.id]: {
                  ...(overwrittenProps[data.id] ?? {}),
                  ...data.props,
                },
              };
            });
            break;
          }
        }

        setOrigin(event.origin);
      });
    }
  }, [haveBooted]);

  const postMessageToParent = useCallback(
    (message: any) => {
      if (origin && window.parent) {
        window.parent.postMessage(message, origin);
      }
    },
    [origin]
  );

  const onElementClick = (props: ElementProps) => {
    setSelected(props.id);
    postMessageToParent({ type: "element_clicked", element: props });
  };

  const hovered = hoveredStack.at(-1);

  const pushHovered = (hovered: string) => {
    setHoveredStack((hoveredStack) => [
      hovered,
      ...hoveredStack.filter((v) => v !== hovered),
    ]);
  };

  const popHovered = (hovered: string) => {
    setHoveredStack((hoveredStack) =>
      hoveredStack.filter((v) => v !== hovered)
    );
  };
  return (
    <EditableContext.Provider
      value={{
        attributes: overwrittenProps,
        onElementClick,
        editModeEnabled,
        pushHovered,
        popHovered,
        selected,
        setSelected,
        hovered,
      }}
    >
      {children}
    </EditableContext.Provider>
  );
};

export default function withEditableWrapper_<P extends PropsWithChildren>(
  Comp: React.ComponentType<P>
) {
  return function Wrapped(props: P) {
    // If we are not running in the web the windows will causes
    // issues hence editable mode is not enabled.
    if (Platform.OS !== "web") {
      return <Comp {...props}></Comp>;
    }

    return (
      <EditablePage>
        <Comp {...props}></Comp>
      </EditablePage>
    );
  };
}

'use client';

import { Button } from "@/components/ui/button";
import { Form, RectangleHorizontal } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AlphaTabApi {
  settings: {
    display: {
      layoutMode: number;
    };
  };
  updateSettings: () => void;
  render: () => void;
}

interface LayoutControlProps {
  apiRef: AlphaTabApi | null
}

export default function LayoutControl({ apiRef }: LayoutControlProps) {
  const [selectValue, setSelectValue] = useState("horizontal");


  function handleLayout(value: string): void {
    setSelectValue(value);
    if (apiRef) {
      // AlphaTab LayoutMode: Page = 0, Horizontal = 1
      apiRef.settings.display.layoutMode = value === 'horizontal' ? 1 : 0;
      apiRef.updateSettings();
      apiRef.render();
    }
  }

  return (
    <div className="relative inline-block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            {selectValue === "horizontal" ? (
              <RectangleHorizontal />
            ) : (
              <Form />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuRadioGroup value={selectValue} onValueChange={(e) => handleLayout(e)}>
            <DropdownMenuRadioItem value="page">
              <Form />{" "}
              Page
            </DropdownMenuRadioItem>

            <DropdownMenuRadioItem value="horizontal">
              <RectangleHorizontal />{" "}
              Horizontal
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
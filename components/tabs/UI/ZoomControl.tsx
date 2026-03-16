"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

interface AlphaTabApi {
  settings: {
    display: {
      scale: number;
    };
  };
  updateSettings: () => void;
  render: () => void;
}

interface ZoomControlProps {
  apiRef: AlphaTabApi | null;
}

export default function ZoomControl({ apiRef}: ZoomControlProps) {
  const [selectValue, setSelectValue] = useState("100");

  function handleZoom(value: string) {
    const zoom = parseInt(value) / 100;
    setSelectValue(value);
    if (apiRef) {
      apiRef.settings.display.scale = zoom;
      apiRef.updateSettings();
      apiRef.render();
    }
  }

  return (
    <div className="relative inline-block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            {selectValue === '100' ? (
              <Search />
            ) : (
              parseFloat(selectValue) > 100 ? (
                <ZoomIn />
              ) : (
                <ZoomOut />
              )
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuRadioGroup
            value={selectValue}
            onValueChange={(e) => handleZoom(e)}
          >
            <DropdownMenuRadioItem value="25">
              25%
            </DropdownMenuRadioItem>

            <DropdownMenuRadioItem value="50">
              50%
            </DropdownMenuRadioItem>

            <DropdownMenuRadioItem value="75">
              75%
            </DropdownMenuRadioItem>

            <DropdownMenuRadioItem value="90">
              90%
            </DropdownMenuRadioItem>

            <DropdownMenuRadioItem value="100">
              100%
            </DropdownMenuRadioItem>

            <DropdownMenuRadioItem value="110">
              110%
            </DropdownMenuRadioItem>

            <DropdownMenuRadioItem value="125">
              125%
            </DropdownMenuRadioItem>

            <DropdownMenuRadioItem value="150">
              150%
            </DropdownMenuRadioItem>

            <DropdownMenuRadioItem value="200">
              200%
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
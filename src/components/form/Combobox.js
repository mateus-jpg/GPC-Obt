"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  Popover,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { ScrollArea } from "../ui/scroll-area";
import { PopoverPortal } from "@radix-ui/react-popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";

// A reusable Combobox with "create" functionality
export function CreateCombobox({ label, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(options);
  const [searchQuery, setSearchQuery] = useState("");

  const isNewItem = searchQuery.length > 0 && !items.some(
    (item) => item.toLowerCase() === searchQuery.toLowerCase()
  );

  useEffect(() => {
    setItems(options);
  }, [options]);

  const handleSelect = (selectedItem) => {
    onChange(selectedItem);
    setSearchQuery("");
    setOpen(false);
  };

  const handleCreate = () => {
    const newItem = searchQuery.trim();
    if (!newItem) return;

    setItems((prev) => [...prev, newItem]);
    handleSelect(newItem);
  };

  // Filter items based on search query
  const filteredItems = items.filter(item => 
    item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Popover open={open} modal={false} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearchQuery("");
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="justify-between w-full"
          >
            {value || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="p-0 w-full z-50 max-h-100 border rounded-lg mt-0.5"
            align="start">
            <Command shouldFilter={false} className="">
              <CommandInput
                placeholder={`Cerca o aggiungi ${label.toLowerCase()}...`}
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandEmpty>Nessun risultato.</CommandEmpty>
              <ScrollArea className={'[&>[data-radix-scroll-area-viewport]]:max-h-100'}>
                <CommandGroup>
                  {filteredItems.map((opt) => (
                    <CommandItem
                      key={opt}
                      value={opt}
                      onSelect={() => handleSelect(opt)}
                    >
                      {opt}
                    </CommandItem>
                  ))}
                  {isNewItem && (
                    <CommandItem
                      key={searchQuery}
                      value={searchQuery}
                      onSelect={handleCreate}
                      className="text-primary"
                    >
                      ➕ Aggiungi nuova voce "{searchQuery}"
                    </CommandItem>
                  )}
                </CommandGroup>
              </ScrollArea>
            </Command>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </Popover>
    </div>
  );
}

// A reusable Multi-Select Combobox with "create" functionality
export function CreateMultiCombobox({ label, values = [], onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(options);
  const [searchQuery, setSearchQuery] = useState("");

  const isNewItem = searchQuery.length > 0 && !items.some(
    (item) => item.toLowerCase() === searchQuery.toLowerCase()
  );

  useEffect(() => {
    setItems(options);
  }, [options]);

  const toggleValue = (val) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
    setSearchQuery("");
  };

  const handleCreate = () => {
    const newItem = searchQuery.trim();
    if (!newItem) return;

    setItems((prev) => [...prev, newItem]);
    onChange([...values, newItem]);
    setSearchQuery("");
  };

  const displayText = () => {
    if (values.length === 0) return placeholder;
    if (values.length <= 2) return values.join(", ");
    return `${values.slice(0, 2).join(", ")} +${values.length - 2} altri`;
  };

  // Filter items based on search query
  const filteredItems = items.filter(item =>
    item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Popover open={open} modal={false} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearchQuery("");
      }}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="justify-between max-w-full">
            <span className="truncate ">{displayText()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="p-0 w-full z-50 max-h-100 border rounded-lg mt-0.5"
            align="start">
            <Command shouldFilter={false} className="">
              <CommandInput
                placeholder={`Cerca o aggiungi ${label.toLowerCase()}...`}
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandEmpty>Nessun risultato.</CommandEmpty>
              <ScrollArea className={'[&>[data-radix-scroll-area-viewport]]:max-h-90'}>
              <CommandGroup >
                  {filteredItems.map((opt) => (
                    <CommandItem
                      key={opt}
                      value={opt}
                      onSelect={() => toggleValue(opt)}
                      onMouseDown={(e) => e.preventDefault()}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center w-full">
                        <input
                          type="checkbox"
                          checked={values.includes(opt)}
                          readOnly
                          className="mr-2 h-4 w-4"
                        />
                        <span>{opt}</span>
                      </div>
                    </CommandItem>
                  ))}
                  {isNewItem && (
                    <CommandItem
                      key={searchQuery}
                      value={searchQuery}
                      onSelect={handleCreate}
                      onMouseDown={(e) => e.preventDefault()}
                      className="text-primary cursor-pointer"
                    >
                      ➕ Aggiungi nuova voce "{searchQuery}"
                    </CommandItem>
                  )}
              </CommandGroup>
                  </ScrollArea>
            </Command>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </Popover>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {values.map((val) => (
            <span
              key={val}
              className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md"
            >
              {val}
              <button
                onClick={() => toggleValue(val)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Updated Combobox component
export function Combobox({ label, value, onChange, options, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Popover open={open} modal={false} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="justify-between w-full"
          >
            {value || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="p-0 w-full z-50 max-h-100 border rounded-lg mt-0.5"
            align="start">
            <Command shouldFilter={false} className="">
              <CommandInput
                placeholder={`Cerca ${label.toLowerCase()}...`}
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandEmpty>Nessun risultato.</CommandEmpty>
              <ScrollArea className={'[&>[data-radix-scroll-area-viewport]]:max-h-100'}>
                <CommandGroup>
                  {filteredOptions.map((opt) => (
                    <CommandItem
                      key={opt}
                      value={opt}
                      onSelect={() => {
                        onChange(opt);
                        setOpen(false);
                      }}
                    >
                      {opt}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            </Command>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </Popover>
    </div>
  );
}

// Updated MultiCombobox component
export function MultiCombobox({
  label,
  values = [],
  onChange,
  options,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleValue = (val) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayText = () => {
    if (values.length === 0) return placeholder;
    if (values.length <= 3) return values.join(", ");
    return `${values.slice(0, 2).join(", ")} +${values.length - 2} altri`;
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Popover open={open} modal={false} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between w-full"
          >
            <span className="truncate">{displayText()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="p-0 w-full z-50 max-h-100 border rounded-lg mt-0.5"
            align="start">
            <Command shouldFilter={false} className="">
              <CommandInput
                placeholder={`Cerca ${label.toLowerCase()}...`}
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandEmpty>Nessun risultato.</CommandEmpty>
              <ScrollArea className={'[&>[data-radix-scroll-area-viewport]]:max-h-100'}>
                <CommandGroup>
                  {filteredOptions.map((opt) => (
                    <CommandItem
                      key={opt}
                      value={opt}
                      onSelect={() => toggleValue(opt)}
                      onMouseDown={(e) => e.preventDefault()}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center w-full">
                        <input
                          type="checkbox"
                          checked={values.includes(opt)}
                          readOnly
                          className="mr-2 h-4 w-4"
                        />
                        <span>{opt}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            </Command>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </Popover>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {values.map((val) => (
            <span
              key={val}
              className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md"
            >
              {val}
              <button
                onClick={() => toggleValue(val)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
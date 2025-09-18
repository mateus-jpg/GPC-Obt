"use client"; // Add this directive if you're using Next.js App Router

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

// A reusable Combobox with "create" functionality
export function CreateCombobox({ label, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(options);
  const [searchQuery, setSearchQuery] = useState(""); // State to hold the input value

  // Check if the current search query can be a new item
  const isNewItem = searchQuery.length > 0 && !items.some(
    (item) => item.toLowerCase() === searchQuery.toLowerCase()
  );

  const handleSelect = (selectedItem) => {
    onChange(selectedItem);
    setSearchQuery(""); // Reset search query on select
    setOpen(false);
  };

  const handleCreate = () => {
    const newItem = searchQuery.trim();
    if (!newItem) return;

    setItems((prev) => [...prev, newItem]);
    handleSelect(newItem);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearchQuery(""); // Reset search on close
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="justify-between w-[300px]"
          >
            {value || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px]">
          <Command shouldFilter={true}>
            <CommandInput
              placeholder={`Cerca o aggiungi ${label.toLowerCase()}...`}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandEmpty>Nessun risultato.</CommandEmpty>
            <CommandGroup>
              {items.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => handleSelect(opt)}
                >
                  {opt}
                </CommandItem>
              ))}
              {/* Conditionally render the "create new" option at the bottom */}
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
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// A reusable Multi-Select Combobox with "create" functionality
export function CreateMultiCombobox({ label, values = [], onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(options);
  const [searchQuery, setSearchQuery] = useState(""); // State to hold the input value

  // Check if the current search query can be a new item
  const isNewItem = searchQuery.length > 0 && !items.some(
    (item) => item.toLowerCase() === searchQuery.toLowerCase()
  );

  const toggleValue = (val) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
    setSearchQuery(""); // Clear search on select
  };

  const handleCreate = () => {
    const newItem = searchQuery.trim();
    if (!newItem) return;

    setItems((prev) => [...prev, newItem]);
    onChange([...values, newItem]); // Add to selected values
    setSearchQuery(""); // Clear search input
  };

  const displayText = () => {
    if (values.length === 0) return placeholder;
    if (values.length <= 2) return values.join(", ");
    return `${values.slice(0, 2).join(", ")} +${values.length - 2} altri`;
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearchQuery(""); // Reset search on close
      }}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="justify-between w-[300px]">
            <span className="truncate">{displayText()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px]">
          <Command shouldFilter={true}>
            <CommandInput
              placeholder={`Cerca o aggiungi ${label.toLowerCase()}...`}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandEmpty>Nessun risultato.</CommandEmpty>
            <CommandGroup>
              {items.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => toggleValue(opt)}
                  onMouseDown={(e) => e.preventDefault()} // Prevents popover from closing on select
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
              {/* Conditionally render the "create new" option */}
              {isNewItem && (
                <CommandItem
                  key={searchQuery}
                  value={searchQuery}
                  onSelect={handleCreate}
                  onMouseDown={(e) => e.preventDefault()} // Prevents popover from closing
                  className="text-primary cursor-pointer"
                >
                  ➕ Aggiungi nuova voce "{searchQuery}"
                </CommandItem>
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Show selected items as tags below the button */}
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


// Unchanged component
export function Combobox({ label, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="justify-between"
          >
            {value || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px]">
          <Command>
            <CommandInput placeholder={`Cerca ${label.toLowerCase()}...`} />
            <CommandEmpty>Nessun risultato.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
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
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Unchanged component
export function MultiCombobox({
  label,
  values = [],
  onChange,
  options,
  placeholder,
}) {
  const [open, setOpen] = useState(false);

  const toggleValue = (val) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  const displayText = () => {
    if (values.length === 0) return placeholder;
    if (values.length <= 3) return values.join(", ");
    return `${values.slice(0, 2).join(", ")} +${values.length - 2} altri`;
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between"
          >
            <span className="truncate">{displayText()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px]">
          <Command>
            <CommandInput placeholder={`Cerca ${label.toLowerCase()}...`} />
            <CommandEmpty>Nessun risultato.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => toggleValue(opt)}
                >
                  <div className="flex items-center w-full">
                    <input
                      type="checkbox"
                      checked={values.includes(opt)}
                      readOnly
                      className="mr-2"
                    />
                    <span>{opt}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
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
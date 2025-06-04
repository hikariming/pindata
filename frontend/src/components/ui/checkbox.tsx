import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "../../lib/utils"

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled, id, ...props }, ref) => {
    return (
      <label 
        className={cn(
          "relative inline-flex items-center cursor-pointer",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 rounded-sm border border-gray-300 flex items-center justify-center transition-colors",
            checked ? "bg-blue-600 border-blue-600" : "bg-white",
            disabled ? "opacity-50" : "hover:border-gray-400"
          )}
        >
          {checked && (
            <Check className="h-3 w-3 text-white" />
          )}
        </div>
      </label>
    )
  }
)

Checkbox.displayName = "Checkbox"

export { Checkbox } 
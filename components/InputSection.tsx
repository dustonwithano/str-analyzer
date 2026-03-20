interface InputSectionProps {
  title: string
  children: React.ReactNode
}

export function InputSection({ title, children }: InputSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#1f2937]" />
        <p className="text-[10px] font-mono uppercase tracking-widest text-[#4b5563]">{title}</p>
        <div className="h-px flex-1 bg-[#1f2937]" />
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

interface InputFieldProps {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: string
  step?: string
  min?: string
  badge?: string
  fullWidth?: boolean
}

export function InputField({
  label,
  value,
  onChange,
  type = 'number',
  step = '1',
  min = '0',
  badge,
  fullWidth = false,
}: InputFieldProps) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-mono text-[#6b7280] uppercase tracking-wider">{label}</label>
        {badge && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1e3a5f] text-[#3b82f6] border border-[#1d4ed8]">
            {badge}
          </span>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={step}
        min={min}
        className="w-full bg-[#0f1117] border border-[#1f2937] rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#3b82f6] transition-colors"
      />
    </div>
  )
}

export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="col-span-2 flex items-center justify-between py-1">
      <label className="text-[11px] font-mono text-[#6b7280] uppercase tracking-wider">{label}</label>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-[#3b82f6]' : 'bg-[#1f2937]'}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  )
}

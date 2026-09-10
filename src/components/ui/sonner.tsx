import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#1e3a5f] group-[.toaster]:text-white group-[.toaster]:border group-[.toaster]:border-[#2563eb] group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-slate-300",
          actionButton:
            "group-[.toast]:bg-[#2563eb] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-slate-700 group-[.toast]:text-slate-200",
          success:
            "group-[.toaster]:border-emerald-500/50",
          error: "group-[.toaster]:border-red-500/50",
        },
        unstyled: false,
      }}
      position="top-center"
      duration={3000}
      expand={false}
      richColors
      closeButton
      {...props}
    />
  );
};

export { Toaster };

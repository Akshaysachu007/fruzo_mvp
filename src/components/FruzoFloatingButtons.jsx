import React, { useState } from "react";
import { ChevronDown, Instagram, Phone } from "lucide-react";

export function FruzoFloatingButtons() {
    const [isOpen, setIsOpen] = useState(false);

    // Replace these with Fruzo's actual contact details.
    const instagramUrl = "https://instagram.com/YOUR_FRUZO_HANDLE";
    const whatsappUrl = "https://wa.me/91XXXXXXXXXX";
    const phoneNumber = "+91XXXXXXXXXX";

    return (
        <>

            {/* FOLLOW US BUTTON + SOCIAL ICONS */}
            <div className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center">

                {/* Slim edge tab keeps more of the home page visible. */}
                <button
                    type="button"
                    onClick={() => setIsOpen((open) => !open)}
                    aria-expanded={isOpen}
                    aria-controls="fruzo-social-links"
                    aria-label={isOpen ? "Close social links" : "Follow us"}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") setIsOpen(false);
                    }}
                    className="flex h-[104px] w-11 flex-col items-center justify-center gap-2 rounded-l-2xl border border-r-0 border-[#E8CE52] bg-[#FFED96] text-[#1C1B16] shadow-[-2px_2px_10px_rgba(28,27,22,0.10)] transition-colors duration-200 hover:bg-[#FFDC16] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                    <span className="whitespace-nowrap text-[12px] font-bold [writing-mode:vertical-rl]">
                        Follow us
                    </span>

                    <ChevronDown
                        size={19}
                        strokeWidth={2.8}
                        className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""
                            }`}
                    />
                </button>

                {/* Shared warm cream panel opens below the Follow us button. */}
                <div
                    id="fruzo-social-links"
                    className={`absolute right-1 top-full mt-3 flex flex-col items-center gap-2 rounded-full border border-[#E8DEB9] bg-[#FFF8DF] p-2 shadow-[0_8px_24px_rgba(28,27,22,0.14)] transition-all duration-300 ease-out motion-reduce:transition-none ${isOpen
                        ? "translate-y-0 opacity-100"
                        : "pointer-events-none -translate-y-2 opacity-0"
                        }`}
                    aria-hidden={!isOpen}
                    inert={!isOpen}
                >
                    <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Follow Fruzo on Instagram"
                        className="flex h-12 w-12 items-center justify-center rounded-full text-pink-600 transition-all duration-200 hover:scale-110 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                    >
                        <Instagram size={22} />
                    </a>
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Chat with Fruzo on WhatsApp"
                        className="flex h-12 w-12 items-center justify-center rounded-full text-green-600 transition-all duration-200 hover:scale-110 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                    >
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <path d="M20.52 3.48A11.9 11.9 0 0 0 12.05 0C5.47 0 .11 5.35.1 11.94c0 2.1.55 4.16 1.6 5.97L0 24l6.25-1.64a11.94 11.94 0 0 0 5.8 1.48h.01c6.58 0 11.94-5.35 11.94-11.94a11.87 11.87 0 0 0-3.48-8.42ZM12.06 21.82a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.71.97.99-3.62-.24-.37a9.87 9.87 0 0 1-1.51-5.27c0-5.47 4.45-9.92 9.92-9.92a9.85 9.85 0 0 1 7.01 2.91 9.85 9.85 0 0 1 2.9 7.02c0 5.47-4.45 9.92-9.96 9.87Zm5.44-7.42c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.09 4.49.71.3 1.27.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
                        </svg>
                    </a>
                </div>
            </div>

            {/* SEPARATE CALL BUTTON */}
            <a
                href={`tel:${phoneNumber}`}
                aria-label="Call Fruzo"
                className="fixed bottom-[100px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1C1B16] text-white shadow-[0_8px_25px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-1 hover:scale-110 hover:bg-[#333228] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black md:bottom-7 md:right-7"
            >
                <Phone size={23} fill="currentColor" />
            </a>
        </>
    );
}

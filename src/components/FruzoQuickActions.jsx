import React, { useEffect, useId, useRef, useState } from "react";
import { Instagram, LayoutDashboard, Phone, Plus, UserRound } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import "./FruzoQuickActions.css";

function configuredUrl(value, hosts) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hosts.includes(url.hostname.toLowerCase())
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function FruzoQuickActions({ view, onSwitchView, restaurant = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const actionsId = useId();

  // Existing restaurant configuration takes priority over build-time configuration.
  const instagramUrl = configuredUrl(
    restaurant.instagramUrl || import.meta.env.VITE_FRUZO_INSTAGRAM_URL,
    ["instagram.com", "www.instagram.com"],
  );
  const whatsappUrl = configuredUrl(
    restaurant.whatsappUrl || import.meta.env.VITE_FRUZO_WHATSAPP_URL,
    ["wa.me", "api.whatsapp.com", "web.whatsapp.com", "whatsapp.com", "www.whatsapp.com"],
  );
  const phone = String(restaurant.phoneNumber || restaurant.phone || import.meta.env.VITE_FRUZO_PHONE_NUMBER || "").trim();
  const phoneDigits = phone.replace(/[\s().-]/g, "");
  const phoneUrl = /^\+?\d{7,15}$/.test(phoneDigits) ? `tel:${phoneDigits}` : undefined;
  const nextView = view === "admin" ? "customer" : "admin";

  useEffect(() => {
    if (!isOpen) return;
    const outsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outsideClick);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outsideClick);
      document.removeEventListener("keydown", escape);
    };
  }, [isOpen]);

  function closeAfterAction() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  const actions = [
    {
      id: "switch", angle: 180, label: `Switch to ${nextView === "admin" ? "Admin" : "Customer"}`,
      Icon: view === "admin" ? UserRound : LayoutDashboard,
      className: "bg-[#1C1B16] text-white",
      onClick: () => { onSwitchView(nextView); closeAfterAction(); },
    },
    { id: "instagram", angle: 150, label: "Instagram", Icon: Instagram, href: instagramUrl, className: "bg-white text-[#C13584]" },
    { id: "whatsapp", angle: 120, label: "WhatsApp", Icon: FaWhatsapp, href: whatsappUrl, className: "bg-[#25D366] text-white" },
    { id: "call", angle: 90, label: "Call Fruzo", Icon: Phone, href: phoneUrl, className: "bg-[#1C1B16] text-white" },
  ];

  return (
    <div className={`fruzo-quick-actions ${isOpen ? "is-open" : ""}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="fruzo-quick-trigger grid h-[58px] w-[58px] place-items-center rounded-full bg-[#FFDC16] text-black"
        aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
        aria-expanded={isOpen}
        aria-controls={actionsId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <Plus size={24} strokeWidth={2} aria-hidden="true" />
      </button>
      <div id={actionsId} className="fruzo-radial-actions" role="group" aria-label="Quick actions" aria-hidden={!isOpen} inert={!isOpen}>
        {actions.map(({ id, angle, label, Icon, href, className, onClick }, index) => {
          const radians = angle * Math.PI / 180;
          const unavailable = id !== "switch" && !href;
          const description = unavailable ? `${label} — contact not configured` : label;
          const Action = href ? "a" : "button";
          return (
            <div
              key={id}
              className="fruzo-radial-position"
              style={{
                "--radial-x": Math.cos(radians).toFixed(6),
                "--radial-y": (-Math.sin(radians)).toFixed(6),
                "--action-delay": `${index * 40}ms`,
              }}
            >
              <Action
                className={`fruzo-radial-action grid h-[52px] w-[52px] place-items-center rounded-full ${className}`}
                href={href}
                type={href ? undefined : "button"}
                target={href && id !== "call" ? "_blank" : undefined}
                rel={href && id !== "call" ? "noopener noreferrer" : undefined}
                disabled={unavailable}
                aria-label={description}
                tabIndex={isOpen ? undefined : -1}
                onClick={onClick || closeAfterAction}
              >
                <Icon size={23} aria-hidden="true" />
              </Action>
              <span className="fruzo-radial-label" aria-hidden="true">{description}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

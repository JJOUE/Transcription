"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BRANDING_CONFIG } from "@/config/branding";

export function Footer() {
  const pathname = usePathname();
  const isLightFooter = pathname === "/" || pathname === "/about";

  return (
    <footer
      className={isLightFooter ? "bg-white text-gray-900" : "relative text-white"}
      style={
        !isLightFooter
          ? {
              backgroundImage: "url('/bg_2.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : {}
      }
    >
      {!isLightFooter && <div className="absolute inset-0 bg-[#003366]/80"></div>}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="mb-4">
              {BRANDING_CONFIG.USE_LOGO ? (
                <Image
                  src={BRANDING_CONFIG.LOGO_PATH}
                  alt={BRANDING_CONFIG.COMPANY_NAME}
                  width={400}
                  height={60}
                  className={`h-12 w-auto ${isLightFooter ? "" : "filter brightness-0 invert"}`}
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isLightFooter ? "bg-[#003366] text-white" : "bg-white text-[#003366]"
                    }`}
                  >
                    <span className="font-bold text-sm">{BRANDING_CONFIG.COMPANY_SHORT}</span>
                  </div>
                  <span className="text-xl font-semibold">{BRANDING_CONFIG.COMPANY_NAME}</span>
                </div>
              )}
            </div>
            <p className={`max-w-md ${isLightFooter ? "text-gray-600" : "text-gray-300"}`}>
              Professional transcription services for legal professionals, businesses, and individuals
              across Canada. Accurate, secure, and reliable.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <ul className={`space-y-2 ${isLightFooter ? "text-gray-600" : "text-gray-300"}`}>
              <li>
                <Link
                  href="/pricing"
                  className={`transition-colors ${
                    isLightFooter ? "hover:text-[#003366]" : "hover:text-white"
                  }`}
                >
                  AI Transcription
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className={`transition-colors ${
                    isLightFooter ? "hover:text-[#003366]" : "hover:text-white"
                  }`}
                >
                  Human Transcription
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className={`transition-colors ${
                    isLightFooter ? "hover:text-[#003366]" : "hover:text-white"
                  }`}
                >
                  Hybrid Review
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className={`space-y-2 ${isLightFooter ? "text-gray-600" : "text-gray-300"}`}>
              <li>
                <Link
                  href="/about"
                  className={`transition-colors ${
                    isLightFooter ? "hover:text-[#003366]" : "hover:text-white"
                  }`}
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className={`transition-colors ${
                    isLightFooter ? "hover:text-[#003366]" : "hover:text-white"
                  }`}
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className={`transition-colors ${
                    isLightFooter ? "hover:text-[#003366]" : "hover:text-white"
                  }`}
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className={`transition-colors ${
                    isLightFooter ? "hover:text-[#003366]" : "hover:text-white"
                  }`}
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div
          className={`border-t mt-8 pt-8 text-center ${
            isLightFooter ? "border-gray-300 text-gray-600" : "border-gray-400 text-gray-300"
          }`}
        >
          <p>&copy; 2025 Talk To Text Canada. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

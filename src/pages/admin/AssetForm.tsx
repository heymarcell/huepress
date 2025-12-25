import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { AlertModal } from "@/components/ui/AlertModal";
import { Upload, Save, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api-client";

import { Tag } from "@/api/types";

import { jsPDF } from "jspdf";
import "svg2pdf.js";
import QRCode from "qrcode";

const HUEPRESS_LOGO_SVG = `<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 932 257.1">
  <defs>
    <style>
      .st0 { fill: #231f20; }
      .st1 { fill: #fff; }
      .st2 { fill: #565656; }
      .st3 { fill: #181818; }
      .st4 { fill: #f2f2f2; }
      .st5 { fill: #999; }
    </style>
  </defs>
  <g>
    <rect class="st2" x="27.9" y="44.2" width="144.4" height="197.5" rx="15.9" ry="15.9" transform="translate(-23.3 19.6) rotate(-10)"/>
    <rect class="st5" x="48.4" y="26.2" width="144.4" height="197.5" rx="15.9" ry="15.9" transform="translate(-10.4 11) rotate(-5)"/>
    <path class="st1" d="M205.3,53.9h-23.5c-8.4,0-15.3-6.8-15.3-15.3V15.3h-83.2c-1.8,0-3.5.5-5,1.4-.3.2-.5.3-.8.5-.5.4-.9.8-1.4,1.2-.1.1-.2.2-.3.3-.2.2-.4.5-.6.7-.3.4-.5.8-.7,1.2-.1.3-.3.6-.4.9-.4,1-.6,2.1-.6,3.3v165.5c0,1.2.2,2.3.6,3.3.1.3.2.6.4.9,0,.1.1.3.2.4.2.4.5.8.7,1.2,0,.1.2.2.3.4.3.4.6.7,1,1s.2.2.3.3c.4.3.7.6,1.1.8,1.5.9,3.2,1.4,5,1.4h112.4c1.2,0,2.3-.2,3.3-.6.1,0,.3-.1.4-.2.4-.2.8-.4,1.2-.6.4-.2.8-.5,1.1-.8.1,0,.2-.2.3-.3.3-.3.5-.5.8-.8.2-.2.3-.4.4-.5.2-.3.4-.6.6-.9.3-.5.5-1,.7-1.5.4-1,.6-2.1.6-3.3V53.9Z"/>
    <path class="st4" d="M181.8,47.5h19.1l-26.4-26.2-1.7-1.7v19c0,4.9,4,8.9,8.9,8.9Z"/>
    <path class="st3" d="M74.6,194.6c-.1-.3-.3-.6-.4-.9.1.3.2.6.4.9Z"/>
    <path class="st3" d="M75.6,196.1c-.3-.4-.5-.8-.7-1.2.2.4.5.8.7,1.2Z"/>
    <path class="st3" d="M74.3,21.6c.1-.3.2-.6.4-.9-.1.3-.3.6-.4.9Z"/>
    <path class="st3" d="M204,195.2c-.2.3-.4.6-.6.9.2-.3.4-.6.6-.9Z"/>
    <path class="st3" d="M201.8,197.8c-.4.3-.7.6-1.1.8.4-.2.8-.5,1.1-.8Z"/>
    <path class="st3" d="M78.3,198.6c-.4-.2-.8-.5-1.1-.8.4.3.7.6,1.1.8Z"/>
    <path class="st3" d="M166.5,15.3h-83.2c-1.8,0-3.5.5-5,1.4,1.5-.9,3.2-1.4,5-1.4h83.2Z"/>
    <path class="st3" d="M75.3,19.5c.2-.3.4-.5.6-.7-.2.2-.4.5-.6.7Z"/>
    <path class="st3" d="M75.9,196.5c.3.4.6.7,1,1-.3-.3-.7-.6-1-1Z"/>
    <line class="st3" x1="177.5" y1="15.3" x2="177.5" y2="15.3"/>
    <path class="st3" d="M202.2,197.5c.3-.3.5-.5.8-.8-.2.3-.5.6-.8.8Z"/>
    <path class="st3" d="M73.7,24.9c0-1.2.2-2.3.6-3.3-.4,1-.6,2.1-.6,3.3v165.5c0,1.2.2,2.3.6,3.3-.4-1-.6-2.1-.6-3.3V24.9Z"/>
    <path class="st3" d="M77.5,17.2c-.5.4-.9.8-1.4,1.2.4-.5.9-.9,1.4-1.2Z"/>
    <path class="st3" d="M211.1,48.6l-5.7-5.7-27.9-27.6h0l-5.8-5.8c-.4-.4-.9-.6-1.5-.6h-86.9c-8.8,0-16,7.2-16,16v165.5c0,8.8,7.2,16,16,16h112.4c8.8,0,16-7.2,16-16V50.1c0-.6-.2-1.1-.6-1.5ZM200.9,47.5h-19.1c-4.9,0-8.9-4-8.9-8.9v-19l1.7,1.7,26.4,26.2ZM205.3,190.4c0,1.2-.2,2.3-.6,3.3-.2.5-.4,1-.7,1.5-.2.3-.4.6-.6.9-.1.2-.3.4-.4.5-.2.3-.5.6-.8.8-.1.1-.2.2-.3.3-.4.3-.7.6-1.1.8-.4.2-.8.5-1.2.6-.1,0-.3.1-.4.2-1,.4-2.1.6-3.3.6h-112.4c-1.8,0-3.5-.5-5-1.4-.4-.2-.8-.5-1.1-.8-.1,0-.2-.2-.3-.3-.3-.3-.7-.6-1-1,0-.1-.2-.2-.3-.4-.3-.4-.5-.8-.7-1.2,0-.1-.1-.3-.2-.4-.1-.3-.3-.6-.4-.9-.4-1-.6-2.1-.6-3.3V24.9c0-1.2.2-2.3.6-3.3.1-.3.2-.6.4-.9.2-.4.4-.8.7-1.2.2-.3.4-.5.6-.7,0-.1.2-.2.3-.3.4-.5.9-.9,1.4-1.2.2-.2.5-.4.8-.5,1.5-.9,3.2-1.4,5-1.4h83.2v23.3c0,8.4,6.8,15.3,15.3,15.3h23.5v136.5Z"/>
    <path d="M137.6,165c-19.1,2.1-35.3-11.3-38.8-29.9-4-6-6.7-12.5-6.4-19.8.6-14.8,10.9-27.5,24.2-33.2,3.9-1.7,8-2.6,12.2-3.5,8.5-4.1,17.9-5.3,27.3-3.5,15.5,4.4,25.3,16.3,25.8,32.6,5.9,11.6,4.9,25.1-2.7,35.8s-15.2,13.7-25.3,15.7c-5.2,2.8-10.4,5.1-16.4,5.7ZM174.9,98.5c-3.7-11.9-16.4-19.9-28.5-18.8,4.1,1.3,7.7,3,11.3,5.2s5.4,4.4,8.3,6.6l8.9,7ZM151.6,88c-4.9-3.6-21.8-7-25.4-1.1,12.7-3.2,14.2-1.1,25.4,1.1ZM98.8,122c1.2-9,4.8-16.3,10.2-23,2.3-3.8,4.6-7.2,7.3-10.8-11.9,5.5-21.8,21.3-17.5,33.8ZM115.7,107c3.9-7.2,10-12.2,16.8-15.9-7,1.1-14.2,4.6-18.2,10.6-3.6,5.5-3.7,12.8-3.1,19.2,1-4.8,1.8-9.4,4.4-13.9ZM163.5,127.4c1.4-2,3.2-4.6,3-7-.8-10.6-8.5-23-18.7-26.9-11.3-.2-21.2,5.8-26.9,15.2s-5.4,15.9-2.7,24.2c1.5,4.7,4.7,7.9,9.8,8.9,12.5,2.5,27.9-4,35.5-14.6ZM161.5,96.6c2.3,2.9,4.3,5.8,6.3,8.9-.9-4-2-7.8-6.3-8.9ZM172.6,125.9c2.6-5.2,3.9-10.4,3.9-16.1s-1.5-3.4-2.7-4.6c1,5.7.9,11-1,16.5-.4,1.2-.3,3-.2,4.2ZM113,139.4c-5.1-7.2-7.4-14.8-7.5-22.9-1.8,5.1-2.2,10.2-1.7,15.5,2.7,2.9,5.4,5.9,9.2,7.4ZM164.5,149.7c9.6-4.3,17.4-18.1,15.8-28.6-2.4,7.6-6.9,13-10.5,19.5l-5.2,9.2ZM163.3,138.7c1.4-1.7,2.5-3.2,2.2-5.4-7.1,7.6-15.9,12.1-25.9,14,8.9.5,17.2-2.8,23.7-8.6ZM133.8,156.6c-4.1-2.1-7.8-4.4-11.4-7.1-5.7-1.6-10.8-4-15.9-7.6,5.8,13.2,20.5,20.9,34.5,16.8-2.4-.5-4.6-1.2-7.2-2.2ZM157.2,149.2c-5.5,2.3-10.7,3.6-16.7,3.5,5.9,1.7,13,3.1,16.7-3.5Z"/>
  </g>
  <g>
    <path class="st0" d="M241.6,184l15.5-110.7h14.7l-6.8,49.3h55.3l6.8-49.3h14.7l-15.5,110.7h-14.7l6.8-48h-55.4l-6.7,48h-14.7Z"/>
    <path class="st0" d="M380.9,185.8c-5.9,0-11.1-1.4-15.4-4.2-4.3-2.8-7.4-6.7-9.3-11.7-1.9-5.1-2.4-11-1.5-17.8l6.8-48.1h14l-7,48.7c-.5,4-.1,7.4,1,10.4,1.2,3,3.1,5.3,5.6,6.9,2.6,1.6,5.7,2.5,9.5,2.5s7.4-.9,10.6-2.6c3.2-1.7,5.8-4.2,8-7.4,2.1-3.2,3.5-6.9,4.2-11.3l6.5-47.3h14l-11.1,80.1h-13.5l2.1-15.6,2.1,1.8c-2.7,5.1-6.3,8.9-11,11.6-4.7,2.7-9.9,4-15.6,4Z"/>
    <path class="st0" d="M479.6,185.8c-7.4,0-14-1.7-19.7-5.1-5.7-3.4-10.2-8-13.4-13.9-3.2-5.9-4.8-12.6-4.8-20.1s1-11.7,3.1-17.1c2.1-5.3,5-10.1,8.8-14.3,3.8-4.2,8.2-7.4,13.2-9.7,5.1-2.3,10.6-3.5,16.5-3.5s14.1,1.7,19.3,5.1c5.3,3.4,9.3,7.8,12,13.2,2.8,5.4,4.2,11.3,4.2,17.6s-.1,3.5-.4,5.4c-.3,1.9-.6,3.5-.9,4.9h-65.7l.7-12h57.8l-7.1,5.2c1.4-5,1.3-9.5-.1-13.5-1.5-4.1-4-7.3-7.5-9.7-3.5-2.4-7.7-3.6-12.4-3.6s-10.9,1.5-14.9,4.5-7,7-9.1,12.2c-2,5.2-3,11.1-3,17.8s1.1,9.3,3.2,12.9c2.1,3.7,5,6.5,8.5,8.4s7.5,2.9,11.9,2.9,10.1-1.3,14-3.8c3.9-2.5,7.1-5.7,9.6-9.6l11.4,6.4c-1.9,3.7-4.6,7-8,10-3.5,3-7.5,5.3-12.2,7.1-4.7,1.7-9.7,2.6-15,2.6Z"/>
    <path class="st0" d="M539.1,184v-110.7h42.5c7.6,0,14.4,1.3,20.3,4,5.9,2.7,10.5,6.6,13.9,11.9,3.4,5.3,5.1,11.7,5.1,19.5s-1.7,13.9-5.1,19.2c-3.4,5.3-8.1,9.2-14,12-5.9,2.7-12.6,4.1-20.1,4.1h-19.5v40.1h-23ZM562.1,123.8h19.6c3.3,0,6.1-.6,8.5-1.9,2.4-1.3,4.2-3.1,5.6-5.4,1.3-2.3,2-4.9,2-7.9s-.7-5.7-2-8c-1.3-2.3-3.2-4.1-5.6-5.4-2.4-1.3-5.2-1.9-8.5-1.9h-19.6v30.5Z"/>
    <path class="st0" d="M633.8,184v-81.1h20.8v19.5l-1.5-2.8c1.8-6.8,4.7-11.5,8.8-13.9,4.1-2.4,9-3.6,14.6-3.6h4.8v19.3h-7c-5.5,0-9.9,1.7-13.2,5-3.4,3.3-5.1,8-5.1,14v43.7h-22.3Z"/>
    <path class="st0" d="M730.4,185.8c-8.6,0-16.1-1.9-22.4-5.7-6.3-3.8-11.2-8.9-14.7-15.4-3.5-6.4-5.2-13.6-5.2-21.4s1.8-15.4,5.4-21.7c3.6-6.3,8.5-11.3,14.6-15,6.1-3.7,13.1-5.5,20.8-5.5s12.1,1,17.1,3c5,2,9.1,4.9,12.6,8.5,3.4,3.7,6,7.9,7.8,12.7,1.8,4.8,2.7,10,2.7,15.7s0,3.1-.2,4.7c-.1,1.5-.4,2.8-.8,3.9h-60.8v-16.3h48.1l-10.6,7.7c1-4.3.9-8-.2-11.4-1.1-3.3-3-5.9-5.7-7.9-2.7-1.9-6.1-2.9-10-2.9s-7.2.9-10,2.8c-2.8,1.9-4.9,4.7-6.2,8.3-1.4,3.7-1.9,8.1-1.6,13.4-.4,4.6.1,8.6,1.6,12,1.5,3.5,3.8,6.2,6.8,8.1,3.1,1.9,6.8,2.9,11.1,2.9s7.4-.8,10.2-2.4c2.8-1.6,5-3.8,6.6-6.5l17.8,8.5c-1.6,4-4.1,7.4-7.5,10.4s-7.5,5.3-12.1,6.9c-4.7,1.6-9.8,2.5-15.3,2.5Z"/>
    <path class="st0" d="M814.3,185.8c-8.9,0-16.7-2.1-23.3-6.3-6.6-4.2-11.1-9.9-13.4-17l16.3-7.7c2.1,4.4,4.9,7.8,8.5,10.3,3.6,2.5,7.5,3.7,11.9,3.7s5.6-.6,7.3-1.9c1.7-1.3,2.5-3.1,2.5-5.4s-.3-2.2-.9-3c-.6-.8-1.5-1.6-2.7-2.3-1.2-.7-2.7-1.3-4.5-1.8l-13.8-3.9c-6.6-1.9-11.7-4.9-15.3-9.1-3.6-4.2-5.3-9.2-5.3-14.9s1.3-9.5,3.9-13.2c2.6-3.8,6.2-6.7,10.8-8.8,4.7-2.1,10-3.2,16-3.2s14.9,1.9,20.9,5.6c6,3.7,10.2,8.9,12.7,15.7l-16.5,7.7c-1.2-3.4-3.3-6.1-6.5-8.1-3.1-2-6.7-3-10.6-3s-5.1.6-6.8,1.8c-1.6,1.2-2.5,2.8-2.5,4.9s.3,2.1.9,3,1.6,1.7,2.9,2.4c1.3.7,3,1.3,5,1.9l12.9,3.9c6.7,2,11.9,5,15.5,9s5.4,8.9,5.4,14.8-1.3,9.5-3.9,13.2c-2.6,3.8-6.3,6.7-10.9,8.8-4.7,2.1-10.2,3.2-16.5,3.2Z"/>
    <path class="st0" d="M892.5,185.8c-8.9,0-16.7-2.1-23.3-6.3-6.6-4.2-11.1-9.9-13.4-17l16.3-7.7c2.1,4.4,4.9,7.8,8.5,10.3,3.6,2.5,7.5,3.7,11.9,3.7s5.6-.6,7.3-1.9c1.7-1.3,2.5-3.1,2.5-5.4s-.3-2.2-.9-3c-.6-.8-1.5-1.6-2.7-2.3-1.2-.7-2.7-1.3-4.5-1.8l-13.8-3.9c-6.6-1.9-11.7-4.9-15.3-9.1-3.6-4.2-5.3-9.2-5.3-14.9s1.3-9.5,3.9-13.2c2.6-3.8,6.2-6.7,10.8-8.8,4.7-2.1,10-3.2,16-3.2s14.9,1.9,20.9,5.6c6,3.7,10.2,8.9,12.7,15.7l-16.5,7.7c-1.2-3.4-3.3-6.1-6.5-8.1-3.1-2-6.7-3-10.6-3s-5.1.6-6.8,1.8c-1.6,1.2-2.5,2.8-2.5,4.9s.3,2.1.9,3,1.6,1.7,2.9,2.4c1.3.7,3,1.3,5,1.9l12.9,3.9c6.7,2,11.9,5,15.5,9s5.4,8.9,5.4,14.8-1.3,9.5-3.9,13.2c-2.6,3.8-6.3,6.7-10.9,8.8-4.7,2.1-10.2,3.2-16.5,3.2Z"/>
  </g>
</svg>`;

const SOCIAL_ICONS = {
  INSTAGRAM: `<svg viewBox="0 0 24 24" fill="none" class="w-6 h-6"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4-8c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4zm-4-2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm4-2.5c0 .28-.22.5-.5.5s-.5-.22-.5-.5.22-.5.5-.5.5.22.5.5z" fill="#303030"/></svg>`, // Simple circle representation
  FACEBOOK: `<svg viewBox="0 0 24 24" fill="#303030"><path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z"/></svg>`,
  PINTEREST: `<svg viewBox="0 0 24 24" fill="#303030"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.65 7.89 6.43 9.35-.09-.79-.16-2.01.03-2.87.17-.78 1.1-4.66 1.1-4.66s-.28-.56-.28-1.39c0-1.3.75-2.27 1.69-2.27.8 0 1.18.6 1.18 1.32 0 .8-.51 2.01-.77 3.12-.22.93.47 1.69 1.38 1.69 1.66 0 2.94-1.75 2.94-4.28 0-2.26-1.63-3.84-3.95-3.84-2.88 0-4.57 2.16-4.57 4.39 0 .87.33 1.8.75 2.3.08.1.09.19.07.29l-.28 1.14c-.04.18-.14.22-.33.13-1.22-.57-1.98-2.35-1.98-3.79 0-3.08 2.24-5.92 6.46-5.92 3.39 0 6.02 2.42 6.02 5.65 0 3.38-2.13 6.1-5.1 6.1-.99 0-1.92-.52-2.24-1.13l-.61 2.32c-.22.84-.81 1.9-1.21 2.54.91.28 1.88.43 2.88.43 5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>`,
  WEBSITE: `<svg viewBox="0 0 24 24" fill="#303030"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`
};

// Helper to parse comma-separated tags
const parseTags = (tags: string) => tags.split(",").map(t => t.trim()).filter(Boolean);


interface AssetFormData {
  title: string;
  description: string;
  category: string;
  skill: string;
  tags: string;
  status: "draft" | "published";
  // SEO Fields
  extendedDescription: string;
  funFacts: string; // Newline separated
  suggestedActivities: string; // Newline separated
  coloringTips: string;
  therapeuticBenefits: string;
  metaKeywords: string;
  asset_id?: string;
}

export default function AdminAssetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [availableTags, setAvailableTags] = useState<Record<string, Tag[]>>({});
  
  const [formData, setFormData] = useState<AssetFormData>({
    title: "",
    description: "",
    category: "", // Will be set after loading tags
    skill: "",
    tags: "",
    status: "draft",
    extendedDescription: "",
    funFacts: "",
    suggestedActivities: "",
    coloringTips: "",
    therapeuticBenefits: "",
    metaKeywords: "",
  });

  // Fetch Tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const data = await apiClient.tags.list();
        setAvailableTags(data.grouped);
        
        // Set defaults if empty
        setFormData(prev => ({
          ...prev,
          category: prev.category || data.grouped.category?.[0]?.name || "",
          skill: prev.skill || data.grouped.skill?.[0]?.name || ""
        }));
      } catch (err) {
        console.error("Failed to load tags", err);
      }
    };
    fetchTags();
  }, []);


  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false); // Zoom state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingSvg, setIsProcessingSvg] = useState(false);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, [pdfPreviewUrl, thumbnailPreviewUrl]);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const { user } = useUser();

  /* 
   * Unified file processor that creates PDF and Thumbnail 
   * Accepted from: File Input OR Drop Zone
   */
  const processSvgFile = async (file: File) => {
    if (!file) return;

    // 0. Enforce Prerequisites for Correct ID/Metadata
    if (!formData.title || !formData.category || !formData.description || !formData.skill || !formData.tags) {
      setAlertState({
        isOpen: true,
        title: "Missing Info",
        message: "Please enter a Title, Description, Category, Skill Level, and Tags first so we can generate the correct Asset ID and Metadata.",
        variant: "info"
      });
      return;
    }

    setIsProcessingSvg(true);
    try {
      // 1. Create Draft Asset (saves all form data, returns ID & slug)
      const { assetId, slug } = await apiClient.admin.createDraft(
        { 
          title: formData.title, 
          description: formData.description, 
          category: formData.category, 
          skill: formData.skill, 
          tags: formData.tags 
        }, 
        user?.emailAddresses[0].emailAddress || ""
      );
      
      if (!assetId || !slug) {
        throw new Error("Failed to create draft. Please try again.");
      }
      
      // 2. Generate Filename (with Real ID and Slug)
      const baseFilename = `huepress-${assetId}-${slug}`; 

      // 3. WebP Generation (Canvas) - Forced 1:1 Square - Forced 1:1 Square
      const webpBlob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const SIZE = 1024; // Standardize thumbnail size
          const canvas = document.createElement("canvas");
          canvas.width = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("No canvas context"));
          
          // White Background
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, SIZE, SIZE);
          
          // Calculate Scale (Contain)
          const scale = Math.min(SIZE / img.width, SIZE / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (SIZE - w) / 2;
          const y = (SIZE - h) / 2;
          
          // Draw Centered
          ctx.drawImage(img, x, y, w, h);
          
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas blob failed"));
          }, "image/webp", 0.9);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
      
      const webpFile = new File([webpBlob], `${baseFilename}.webp`, { type: "image/webp" });
      setThumbnailFile(webpFile);
      setThumbnailPreviewUrl(URL.createObjectURL(webpFile));

      // 3. Advanced PDF Generation (Safe Zone & Metadata)
      const svgText = await file.text();
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
      const svgElement = svgDoc.documentElement;

      // Helper to parse dimensions (handle px or unitless)
      const getDim = (val: string | null) => {
        if (!val) return 0;
        return parseFloat(val.replace("px", ""));
      };
      
      // Determine intrinsic size (width/height attr -> viewBox -> Default A4 pt)
      const viewBox = svgElement.getAttribute("viewBox")?.split(/[\s,]+/).map(parseFloat);
      const svgW = getDim(svgElement.getAttribute("width")) || (viewBox ? viewBox[2] : 595);
      const svgH = getDim(svgElement.getAttribute("height")) || (viewBox ? viewBox[3] : 842);

      // A4 Dimensions (mm)
      const A4_WIDTH = 210;
      const A4_HEIGHT = 297;
      
      // Safe Zone (mm) - Optimized for 8.5x11" (Letter) and A4 compatibility
      // Letter is wider (216mm) but shorter (279mm) than A4.
      // A4 is narrower (210mm) but taller (297mm).
      // To fit BOTH, we must stay within the intersection minus margins.
      // Width: Limited by A4 (210mm) - 25mm margin = 185mm
      // Height: Limited by Letter (279mm) - 25mm margin = 254mm
      const SAFE_WIDTH = 185; 
      const SAFE_HEIGHT = 254;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4" 
      });

      // Build dynamic keywords from tags and form data
      const keywordsArray = [
        formData.category,
        formData.skill,
        ...formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        "coloring page",
        "huepress",
        "printable"
      ];
      const uniqueKeywords = [...new Set(keywordsArray)].join(", ");

      // Inject Metadata (Full Detail)
      doc.setProperties({
        title: `HuePress - ${formData.title} - ${assetId}`,
        subject: `${formData.description} | Website: huepress.co | Support: hello@huepress.co`,
        author: "HuePress",
        keywords: uniqueKeywords,
        creator: "HuePress Automated Generator"
      });

      // Calculate Scale to fit Safe Zone strictly
      const scale = Math.min(SAFE_WIDTH / svgW, SAFE_HEIGHT / svgH);
      const finalW = svgW * scale;
      const finalH = svgH * scale;

      // Center image on A4 page
      const x = (A4_WIDTH - finalW) / 2;
      const y = (A4_HEIGHT - finalH) / 2;

      // Page 1: The Masterpiece
      await doc.svg(svgElement, {
        x,
        y,
        width: finalW,
        height: finalH
      });
      
      // Footer REMOVED per request (clean page for coloring)

      // Page 2: The HuePress Guide (Stylish Marketing Page)
      doc.addPage();
      
      // HEADER - Include Logo from SVG
      const logoParser = new DOMParser();
      const logoDoc = logoParser.parseFromString(HUEPRESS_LOGO_SVG, "image/svg+xml");
      await doc.svg(logoDoc.documentElement, {
        x: 60,
        y: 20,
        width: 90,
        height: 25
      });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text("Color Your World", 105, 52, { align: "center" });
      
      doc.setDrawColor(200);
      doc.line(60, 58, 150, 58); // Separator

      // SECTION 1: PRINTING GUIDE
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(50);
      doc.text("Printing Guide", 20, 75);

      // Box
      doc.setDrawColor(220);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(20, 80, 170, 35, 3, 3, "FD");

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      doc.text("• Use 'Fit to Page' setting to ensure no edges are cut off.", 28, 92);
      doc.text("• We recommend heavy cardstock or mixed media paper.", 28, 100);
      doc.text("• Select 'High Quality' print mode for the crispest lines.", 28, 108);

      // SECTION 2: SHARE & ENGAGE
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(50);
      doc.text("Show Off Your Masterpiece", 20, 135);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      doc.text("We love seeing your creativity! Tag us to be featured:", 20, 145);
      
      doc.setFontSize(12);
      doc.setTextColor(30);
      doc.text("@huepressco  #HuePressColoring", 20, 155);

      // SECTION 3: REVIEWS (Call to Action)
      doc.setDrawColor(200); 
      doc.setLineWidth(0.5);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(20, 175, 170, 45, 3, 3, "S");
      
      // QR Code Generation
      const qrDataUrl = await QRCode.toDataURL("https://www.trustpilot.com/review/huepress.co", { margin: 0 });
      doc.addImage(qrDataUrl, "PNG", 30, 182, 30, 30);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30);
      doc.text("Enjoying this page?", 70, 192); // Left align text next to QR
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text("Help us grow by leaving a review on Trustpilot.", 70, 202);
      doc.text("Scan the QR code or visit:", 70, 210);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("huepress.co/review", 112, 210); // Redirects to Trustpilot

      // FOOTER - SOCIALS
      const startX = 20;
      const iconY = 230;
      const iconSize = 6;
      const lineHeight = 5;
      
      doc.setFontSize(8);
      doc.setTextColor(100);
      
      // Facebook
      const fbNode = new DOMParser().parseFromString(SOCIAL_ICONS.FACEBOOK, "image/svg+xml").documentElement;
      await doc.svg(fbNode, { x: startX, y: iconY, width: iconSize, height: iconSize });
      doc.link(startX, iconY, iconSize, iconSize, { url: "https://facebook.com/huepressco" });
      doc.text("facebook.com/huepressco", startX + iconSize + 2, iconY + iconSize - 1);

      // Instagram
      const igNode = new DOMParser().parseFromString(SOCIAL_ICONS.INSTAGRAM, "image/svg+xml").documentElement;
      await doc.svg(igNode, { x: startX, y: iconY + lineHeight * 2, width: iconSize, height: iconSize });
      doc.link(startX, iconY + lineHeight * 2, iconSize, iconSize, { url: "https://instagram.com/huepressco" });
      doc.text("instagram.com/huepressco", startX + iconSize + 2, iconY + lineHeight * 2 + iconSize - 1);

      // Pinterest
      const pinNode = new DOMParser().parseFromString(SOCIAL_ICONS.PINTEREST, "image/svg+xml").documentElement;
      await doc.svg(pinNode, { x: startX, y: iconY + lineHeight * 4, width: iconSize, height: iconSize });
      doc.link(startX, iconY + lineHeight * 4, iconSize, iconSize, { url: "https://pinterest.com/huepressco" });
      doc.text("pinterest.com/huepressco", startX + iconSize + 2, iconY + lineHeight * 4 + iconSize - 1);

      // Website
      const webNode = new DOMParser().parseFromString(SOCIAL_ICONS.WEBSITE, "image/svg+xml").documentElement;
      await doc.svg(webNode, { x: startX, y: iconY + lineHeight * 6, width: iconSize, height: iconSize });
      doc.link(startX, iconY + lineHeight * 6, iconSize, iconSize, { url: "https://huepress.co" });
      doc.text("huepress.co", startX + iconSize + 2, iconY + lineHeight * 6 + iconSize - 1);

      // Support Email
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text("Questions? Email us: hello@huepress.co", 105, 268, { align: "center" });

      // Copyright
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(`Copyright © ${new Date().getFullYear()} HuePress. All rights reserved.`, 105, 275, { align: "center" });
      
      // Asset ID
      doc.text(`Asset ID: ${assetId}`, 105, 280, { align: "center" });

      const pdfBlob = doc.output("blob");
      const pdfFileObj = new File([pdfBlob], `${baseFilename}.pdf`, { type: "application/pdf" });
      
      // Store assetId in form state
      setFormData(prev => ({ ...prev, asset_id: assetId }));
      setPdfFile(pdfFileObj);
      setThumbnailFile(webpFile);
      setPdfPreviewUrl(URL.createObjectURL(pdfFileObj));
      setThumbnailPreviewUrl(URL.createObjectURL(webpFile));

      // 5. IMMEDIATE UPLOAD - Upload files to backend and finalize draft
      setAlertState({
        isOpen: true,
        title: "Uploading...",
        message: "Saving files to cloud storage...",
        variant: "info"
      });

      const uploadForm = new FormData();
      uploadForm.append("asset_id", assetId);
      uploadForm.append("title", formData.title);
      uploadForm.append("description", formData.description);
      uploadForm.append("category", formData.category);
      uploadForm.append("skill", formData.skill);
      uploadForm.append("tags", formData.tags);
      uploadForm.append("status", "draft"); // Keep as draft until explicitly published
      uploadForm.append("extended_description", formData.extendedDescription);
      uploadForm.append("coloring_tips", formData.coloringTips);
      uploadForm.append("therapeutic_benefits", formData.therapeuticBenefits);
      uploadForm.append("meta_keywords", formData.metaKeywords);
      
      const factsArray = formData.funFacts.split("\\n").map((s: string) => s.trim()).filter(Boolean);
      const activitiesArray = formData.suggestedActivities.split("\\n").map((s: string) => s.trim()).filter(Boolean);
      uploadForm.append("fun_facts", JSON.stringify(factsArray));
      uploadForm.append("suggested_activities", JSON.stringify(activitiesArray));
      
      uploadForm.append("thumbnail", webpFile);
      uploadForm.append("pdf", pdfFileObj);

      const uploadResult = await apiClient.admin.createAsset(uploadForm, user?.emailAddresses[0].emailAddress || "");
      
      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }

      setAlertState({
        isOpen: true,
        title: "Asset Created! ✨",
        message: `Successfully created asset ${assetId}. You can now publish it or continue editing.`,
        variant: "success"
      });

    } catch (err) {
      console.error("SVG Auto-process failed", err);
      setAlertState({
        isOpen: true,
        title: "Magic Failed",
        message: "Could not process SVG. Please upload files manually.",
        variant: "error"
      });
    } finally {
      setIsProcessingSvg(false);
    }
  };

  // Wrapper for input change
  const handleSvgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       processSvgFile(file);
       e.target.value = ""; // Clear input to allow re-selection
    }
  };

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "image/svg+xml") {
      processSvgFile(file);
    } else if (file) {
      setAlertState({
        isOpen: true,
        title: "Invalid File",
        message: "Please upload a valid SVG file.",
        variant: "error"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thumbnailFile || !pdfFile) {
      setAlertState({
        isOpen: true,
        title: "Missing Files",
        message: "Please upload both a thumbnail image and a PDF file.",
        variant: "error"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const form = new FormData();
      // Basic Fields
      form.append("title", formData.title);
      form.append("description", formData.description);
      form.append("category", formData.category);
      form.append("skill", formData.skill);
      form.append("tags", formData.tags);
      form.append("status", formData.status);
      
      // SEO Fields
      form.append("extended_description", formData.extendedDescription);
      form.append("coloring_tips", formData.coloringTips);
      form.append("therapeutic_benefits", formData.therapeuticBenefits);
      form.append("meta_keywords", formData.metaKeywords);
      
      // Forced Asset ID (from Magic gen)
      // Forced Asset ID (from Magic gen)
      if (formData.asset_id) {
         form.append("asset_id", formData.asset_id);
      }
      
      // JSON Arrays (split by newline)
      const factsArray = formData.funFacts.split("\n").map(s => s.trim()).filter(Boolean);
      const activitiesArray = formData.suggestedActivities.split("\n").map(s => s.trim()).filter(Boolean);
      
      form.append("fun_facts", JSON.stringify(factsArray));
      form.append("suggested_activities", JSON.stringify(activitiesArray));

      form.append("thumbnail", thumbnailFile);
      form.append("pdf", pdfFile);

      // Use production API URL if in prod, else local
      // apiClient handles API_URL internally, but createAsset needs manualFormData
      
      const result = await apiClient.admin.createAsset(form, user?.primaryEmailAddress?.emailAddress || "");


      console.log("Asset created:", result);

      navigate("/admin/assets");
    } catch (error) {
      console.error("Error saving asset:", error);
      setAlertState({
        isOpen: true,
        title: "Save Failed",
        message: error instanceof Error ? error.message : "Failed to save asset. Please try again.",
        variant: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link to="/admin/assets" className="flex items-center gap-2 text-gray-500 hover:text-ink mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Assets
          </Link>
          <h1 className="font-serif text-h2 text-ink">
            {isEditing ? "Edit Asset" : "Add New Asset"}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/assets">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSubmit} variant="primary" isLoading={isSubmitting}>
            <Save className="w-4 h-4" />
            {isEditing ? "Update" : "Save Asset"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Basic Info Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-8 space-y-6">
            <h2 className="font-serif text-xl text-ink font-bold">Basic Information</h2>
            
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                placeholder="e.g., Friendly Capybara in Flower Garden"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all"
                placeholder="A cute capybara surrounded by beautiful flowers..."
              />
            </div>
          </div>

          {/* Rich Content Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-8 space-y-6">
            <h2 className="font-serif text-xl text-ink font-bold">Rich Content & SEO</h2>
            
            {/* Extended Description */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Extended Description</label>
              <textarea
                name="extendedDescription"
                value={formData.extendedDescription}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all"
                placeholder="Detailed story about the subject..."
              />
            </div>

            {/* Fun Facts & Activities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Fun Facts (One per line)</label>
                <textarea
                  name="funFacts"
                  value={formData.funFacts}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all"
                  placeholder="Capybaras love water&#10;They are social animals"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Suggested Activities (One per line)</label>
                <textarea
                  name="suggestedActivities"
                  value={formData.suggestedActivities}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all"
                  placeholder="Count the spots&#10;Color the background green"
                />
              </div>
            </div>

            {/* Tips & Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Coloring Tips</label>
                <textarea
                  name="coloringTips"
                  value={formData.coloringTips}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all"
                  placeholder="Start with light colors..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Therapeutic Benefits</label>
                <textarea
                  name="therapeuticBenefits"
                  value={formData.therapeuticBenefits}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all"
                  placeholder="Helps develop focus..."
                />
              </div>
            </div>
            
            {/* Meta Keywords */}
             <div>
              <label className="block text-sm font-medium text-ink mb-2">Meta Keywords</label>
              <input
                type="text"
                name="metaKeywords"
                value={formData.metaKeywords}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Metadata Sidebar */}
        <div className="space-y-6 sticky top-24">
          
          {/* Status Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-6 space-y-4">
            <h3 className="font-bold text-ink">Publishing</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { val: "draft", label: "Draft", icon: EyeOff, color: "yellow" },
                { val: "published", label: "Published", icon: Eye, color: "green" }
              ].map((option) => (
                <label key={option.val} className="relative cursor-pointer group">
                  <input
                    type="radio"
                    name="status"
                    value={option.val}
                    checked={formData.status === option.val}
                    onChange={handleChange}
                    className="peer sr-only"
                  />
                  <div className={`p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                    formData.status === option.val 
                      ? `border-${option.color}-400 bg-${option.color}-50` 
                      : "border-transparent bg-gray-50 hover:bg-gray-100"
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                       formData.status === option.val 
                        ? `bg-${option.color}-200 text-${option.color}-800` 
                        : "bg-gray-200 text-gray-500"
                    }`}>
                      <option.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className={`block font-bold text-sm ${
                        formData.status === option.val ? "text-ink" : "text-gray-500"
                      }`}>{option.label}</span>
                      <span className="text-xs text-gray-400">
                        {option.val === "draft" ? "Only visible to you" : "Visible to everyone"}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Organization Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-6 space-y-6">
            <h3 className="font-bold text-ink">Organization</h3>
            
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none bg-white transition-all"
              >
                <option value="">Select Category</option>
                {(availableTags.category || []).map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Skill Level */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Skill Level *</label>
              <select
                name="skill"
                value={formData.skill}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none bg-white transition-all"
              >
                <option value="">Select Skill</option>
                {(availableTags.skill || []).map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Tags Input */}
            <div>
               <label className="block text-sm font-medium text-ink mb-2">Tags *</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm"
                  placeholder="cat, garden, sunshine..."
                />
                 {/* Theme Clouds */}
                 {availableTags.theme && (
                   <div className="mt-3 flex flex-wrap gap-1.5">
                     {availableTags.theme.slice(0, 8).map(tag => (
                       <button
                         type="button"
                         key={tag.id}
                         onClick={() => {
                            const current = parseTags(formData.tags);
                            if (!current.includes(tag.name)) {
                              setFormData(prev => ({ ...prev, tags: [...current, tag.name].join(", ") }));
                            }
                         }}
                         className="px-2 py-1 text-[10px] uppercase font-bold bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors"
                       >
                         {tag.name}
                       </button>
                     ))}
                   </div>
                 )}
            </div>
          </div>

          {/* Media Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-6 space-y-6">
            <h3 className="font-bold text-ink">Media</h3>
            
            {/* Master SVG Upload (Magic) */}
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-4 rounded-xl border border-primary/10">
              <label className="block text-sm font-bold text-ink mb-1">✨ Magic Upload (SVG)</label>
              <p className="text-xs text-gray-500 mb-3">Upload an SVG to automatically generate the PDF and Thumbnail.</p>
              
              <div 
                className={`relative transition-all ${isDragging ? 'scale-[1.02]' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/svg+xml"
                  onChange={handleSvgChange}
                  className="hidden"
                  id="svg-upload"
                />
                <label
                  htmlFor="svg-upload"
                  className={`flex flex-col items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-all group ${
                     isDragging 
                     ? "border-primary bg-primary/10" 
                     : "border-primary/30 bg-white/50 hover:border-primary hover:bg-white/80"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg transition-transform ${isDragging ? "scale-110" : "group-hover:scale-110"}`}>
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-ink text-center">
                    {isProcessingSvg ? "Generating files..." : (isDragging ? "Drop SVG here!" : "Upload or Drop Master SVG")}
                  </span>
                </label>
              </div>
            </div>

            <div className="my-4 border-t border-gray-100 flex items-center gap-2">
               <span className="text-xs text-gray-400 bg-white px-2 -mt-2.5">OR Manual Upload</span>
            </div>

            {/* Thumbnail */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Thumbnail</label>
              
              {/* Thumbnail Preview */}
              {thumbnailPreviewUrl && (
                <>
                  <div 
                    className="mb-3 relative group w-32 h-32 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden mx-auto cursor-zoom-in"
                    onClick={() => setIsZoomOpen(true)}
                  >
                    <img 
                      src={thumbnailPreviewUrl} 
                      alt="Thumbnail Preview" 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-xs px-2 py-1 rounded-full shadow-sm text-ink font-medium">Zoom</span>
                    </div>
                  </div>
                  
                  {/* Zoom Modal is rendered at root level for proper z-index */}
                </>
              )}

              <div className="relative">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setThumbnailFile(file);
                    if (file) {
                      setThumbnailPreviewUrl(URL.createObjectURL(file));
                    } else {
                      setThumbnailPreviewUrl(null);
                    }
                  }}
                  className="hidden"
                  id="thumbnail-upload"
                />
                <label
                  htmlFor="thumbnail-upload"
                  className={`flex flex-col items-center justify-center gap-2 w-full px-4 py-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                    thumbnailFile ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  <Upload className={`w-4 h-4 ${thumbnailFile ? "text-primary" : "text-gray-400"}`} />
                  <span className={`text-xs ${thumbnailFile ? "text-primary font-medium" : "text-gray-500"}`}>
                    {thumbnailFile ? thumbnailFile.name : "Upload Image"}
                  </span>
                </label>
              </div>
            </div>

            {/* PDF */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">PDF File</label>
              
              {/* Preview Button if PDF exists */}
              {pdfPreviewUrl && (
                <div className="mb-3">
                   <a 
                     href={pdfPreviewUrl} 
                     target="_blank" 
                     rel="noreferrer"
                     className="flex items-center justify-center gap-2 w-full py-2 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100 transition-colors border border-teal-100"
                   >
                     <Eye className="w-4 h-4" />
                     Preview Generated PDF
                   </a>
                </div>
              )}

              <div className="relative">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPdfFile(file);
                    if (file) {
                      setPdfPreviewUrl(URL.createObjectURL(file));
                    } else {
                      setPdfPreviewUrl(null);
                    }
                  }}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className={`flex flex-col items-center justify-center gap-2 w-full px-4 py-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                    pdfFile ? "border-teal-500 bg-teal-50" : "border-gray-200 hover:border-teal-500 hover:bg-teal-50"
                  }`}
                >
                  <Upload className={`w-4 h-4 ${pdfFile ? "text-teal-500" : "text-gray-400"}`} />
                  <span className={`text-xs ${pdfFile ? "text-teal-700 font-medium" : "text-gray-500"}`}>
                    {pdfFile ? pdfFile.name : "Upload PDF"}
                  </span>
                </label>
              </div>
            </div>
          </div>

        </div>
      </form>

      <AlertModal 
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
      />

      {/* Thumbnail Zoom Modal - rendered at root level */}
      {isZoomOpen && thumbnailPreviewUrl && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-8 cursor-zoom-out"
          onClick={() => setIsZoomOpen(false)}
        >
          <img 
            src={thumbnailPreviewUrl} 
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            alt="Zoomed Thumbnail"
          />
          <button 
            className="absolute top-6 right-6 text-white/80 hover:text-white text-3xl font-light"
            onClick={() => setIsZoomOpen(false)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

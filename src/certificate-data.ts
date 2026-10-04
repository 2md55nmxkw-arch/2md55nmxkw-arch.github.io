export type Certificate = {
  title: string;
  issuer: string;
  date: string;
  preview: string;
  pdf: string;
  verificationUrl?: string;
};

export const CERTIFICATES: Certificate[] = [
  {
    title: "WorldSkills Kazakhstan — 3rd place, CyberSecurity",
    issuer: "WorldSkills Kazakhstan",
    date: "2025",
    preview: "assets/certificates/ws-2025-III-Respublic-CyberSecurity.jpg",
    pdf: "assets/certificates/ws-2025-III-Respublic-CyberSecurity.pdf",
  },
];

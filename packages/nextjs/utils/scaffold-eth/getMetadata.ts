import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : `http://localhost:${process.env.PORT || 3000}`;
// OG images must be absolute; IPFS deploys have per-CID URLs, so pin the image to the repo instead.
const ogImageUrl =
  "https://raw.githubusercontent.com/clawdbotatg/allowlists-frontend/main/packages/nextjs/public/thumbnail.jpg";
const titleTemplate = "%s | The Allowlist";

export const getMetadata = ({
  title,
  description,
  imageUrl = ogImageUrl,
}: {
  title: string;
  description: string;
  imageUrl?: string;
}): Metadata => {
  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: title,
      template: titleTemplate,
    },
    description: description,
    openGraph: {
      title: {
        default: title,
        template: titleTemplate,
      },
      description: description,
      images: [
        {
          url: imageUrl,
        },
      ],
    },
    twitter: {
      title: {
        default: title,
        template: titleTemplate,
      },
      description: description,
      images: [imageUrl],
    },
    icons: {
      icon: [
        {
          url: "/favicon.png",
          sizes: "32x32",
          type: "image/png",
        },
      ],
    },
  };
};

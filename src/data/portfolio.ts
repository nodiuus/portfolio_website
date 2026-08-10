import type { XmbCategory } from "../types";

export const portfolioIdentity = {
  name: "Nisan",
  handle: "nisans.dev",
  email: "hello@example.com",
  github: "https://github.com/nodiuus",
} as const;

const icon = (name: string) => `/psp/icons/${name}.svg`;
const ps3Icon = (name: string) => `/psp/icons/ps3/${name}.png`;

export const categories: XmbCategory[] = [
  {
    id: "profile",
    label: "Profile",
    icon: ps3Icon("user"),
    items: [
      {
        id: "profile-summary",
        label: portfolioIdentity.handle,
        description: "Portfolio profile",
        body: "Nisan is based in Flushing, New York City and is currently focused on software engineering opportunities.",
        icon: ps3Icon("account"),
        meta: ["Profile", "Resume"],
      },
      {
        id: "about",
        label: "About",
        description: "Background and focus",
        body: "A concise view of Nisan's location, current status, and preferred work direction.",
        icon: ps3Icon("user"),
      },
      {
        id: "availability",
        label: "Availability",
        description: "Schedule a conversation",
        body: "Nisan is mostly available throughout the week for conversations about software engineering roles.",
        icon: ps3Icon("date-time"),
      },
    ],
  },
  {
    id: "education",
    label: "Education",
    icon: icon("parent-education"),
    items: [
      {
        id: "education-history",
        label: "Education",
        description: "Degree and institution",
        body: "Add Nisan's verified institution, degree, concentration, and graduation date here.",
        icon: icon("child-education"),
      },
      {
        id: "coursework",
        label: "Coursework",
        description: "Relevant study",
        body: "Add only coursework that appears in Nisan's verified resume or transcript.",
        icon: icon("child-coursework"),
      },
      {
        id: "certifications",
        label: "Certifications",
        description: "Credentials",
        body: "Add verified certifications or remove this item if it is not needed.",
        icon: ps3Icon("trophy"),
      },
    ],
  },
  {
    id: "experience",
    label: "Experience",
    icon: ps3Icon("settings"),
    items: [
      {
        label: "Most Recent Role",
        description: "Employer · date range",
        body: "Replace this entry with Nisan's verified role summary.",
        icon: ps3Icon("settings"),
        resume: {
          organization: "Employer name",
          period: "Start date — End date",
          location: "Location or remote",
          highlights: [
            "Add a concise, verified accomplishment with measurable impact.",
            "Add the system, product, or responsibility Nisan directly owned.",
            "Add a second outcome only when it improves recruiter understanding.",
          ],
        },
      },
      {
        label: "Previous Role",
        description: "Employer · date range",
        body: "Replace this entry with another verified role or remove it when the resume is supplied.",
        icon: ps3Icon("date-time"),
        resume: {
          organization: "Previous employer",
          period: "Start date — End date",
          location: "Location or remote",
          highlights: [
            "Summarize the role in one clear responsibility statement.",
            "Add one verified contribution that demonstrates progression.",
          ],
        },
      },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    icon: ps3Icon("game"),
    items: [
      {
        label: "Project Library",
        description: "3 projects",
        body: "Nisan's completed project library.",
        kind: "folder",
        icon: icon("folder"),
        children: [
          {
            label: "Signal Room",
            description: "Realtime dashboard",
            body: "A telemetry console for tracking product usage, alerts, and launch health without making operators hunt.",
            kind: "game",
            art: {
              src: "/projects/signal-room.svg",
              alt: "Signal Room project artwork",
            },
            completed: "Finished — add date",
            meta: ["WebSockets", "Charts", "Operations"],
          },
          {
            label: "Pocket Forge",
            description: "Creative toolkit",
            body: "A compact editor for building shareable assets with fast previews and low-friction exports.",
            kind: "game",
            art: {
              src: "/projects/pocket-forge.svg",
              alt: "Pocket Forge project artwork",
            },
            completed: "Finished — add date",
            meta: ["Canvas", "Workers", "Exports"],
          },
          {
            label: "Dockyard",
            description: "Automation hub",
            body: "A queue-based workflow surface for repetitive team operations and legible state management.",
            kind: "game",
            art: {
              src: "/projects/dockyard.svg",
              alt: "Dockyard project artwork",
            },
            completed: "Finished — add date",
            meta: ["APIs", "Automation", "Developer experience"],
            actions: [{ label: "GitHub", href: portfolioIdentity.github }],
          },
        ],
      },
    ],
  },
  {
    id: "skills",
    label: "Skills",
    icon: ps3Icon("system-settings"),
    items: [
      {
        label: "TypeScript",
        description: "Typed application language",
        body: "Use this item for Nisan's verified TypeScript experience and the systems built with it.",
        icon: icon("typescript"),
        meta: ["Language", "Type systems"],
      },
      {
        label: "SolidJS",
        description: "Reactive interface framework",
        body: "Use this item for Nisan's verified SolidJS experience and component architecture.",
        icon: icon("solidjs"),
        meta: ["Interfaces", "Reactivity"],
      },
      {
        label: "Vite",
        description: "Build and development tooling",
        body: "Use this item for Nisan's verified Vite workflow and frontend build experience.",
        icon: icon("vite"),
        meta: ["Tooling", "Build pipeline"],
      },
      {
        label: "Interface Systems",
        description: "Interaction and accessibility",
        body: "Use this item for verified interface, accessibility, animation, and performance experience.",
        icon: ps3Icon("display-settings"),
      },
      {
        label: "Tools",
        description: "Development workflow",
        body: "List Nisan's verified development tools here rather than adding unverified technologies.",
        icon: ps3Icon("system-settings"),
      },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    icon: ps3Icon("friends"),
    items: [
      {
        label: portfolioIdentity.email,
        description: "Email",
        body: "Replace the placeholder email in src/data/portfolio.ts before publishing.",
        icon: icon("email"),
        actions: [{ label: "Send email", href: `mailto:${portfolioIdentity.email}` }],
      },
      {
        label: "github.com/nodiuus",
        description: "Code and projects",
        body: "Open Nisan's GitHub profile.",
        icon: icon("github"),
        actions: [{ label: "Open GitHub", href: portfolioIdentity.github }],
      },
      {
        label: "Resume",
        description: "PDF document",
        body: "Place Nisan's verified resume at public/resume.pdf before enabling this action.",
        icon: icon("pdf"),
      },
    ],
  },
];

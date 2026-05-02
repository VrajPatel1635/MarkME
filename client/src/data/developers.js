// Mock developer data for MarkMe Developers Page
// Replace with real developer information

export const developers = [
    {
        "id": 1,
        "name": "Aryan Prajapati",
        "role": "Backend, AI & Integration Engineer",
        "avatar": "/aryan-prajapati_profile%20picture.png",
        "highlights": [
            "AI-driven image-based attendance systems",
            "Cloud-deployed biometric recognition services",
            "Concurrent processing & data integrity handling"
        ],
        "contributions": {
            "modules": [
                "Attendance Session & Records Engine",
                "AI Recognition Microservice (FastAPI)",
                "Image Upload & Cloud Persistence Pipeline",
                "Reporting & CSV/Excel Export Utilities"
            ],
            "features": [
                "Engineered a parallel image processing pipeline for classroom attendance, reducing total AI inference time by ~40% for multi-image sessions.",
                "Designed a dynamic Cloudinary-based storage structure supporting bulk classroom image uploads and raw Excel dataset persistence.",
                "Implemented concurrency-safe attendance updates to prevent duplicate or inconsistent records during parallel AI inference.",
                "Built a biometric recognition flow using InsightFace (512-dimensional embeddings) with cross-image student de-duplication.",
                "Deployed and exposed both the backend server and AI microservice on Oracle Cloud Infrastructure with HTTPS via DuckDNS and reverse proxy configuration."
            ],
            "techStack": [
                "Node.js",
                "Express.js",
                "MongoDB",
                "FastAPI",
                "Python",
                "InsightFace (Buffalo_L)",
                "ONNX Runtime",
                "Oracle Cloud Infrastructure",
                "Cloudinary",
                "Multer",
                "Git & Github"
            ],
            "decisions": [
                "Selected InsightFace (Buffalo_L) over legacy dlib models to improve recognition accuracy in crowded classroom conditions.",
                "Capped classroom image uploads to a maximum of four per session to balance inference latency, cost, and recognition coverage.",
                "Adopted parallel asynchronous processing for image analysis to minimize end-to-end attendance marking time.",
                "Deployed and exposed backend and AI services over HTTPS using domain-based routing instead of raw IP access to meet production security standards.",
                "Exposed the AI service over HTTPS using domain-based routing instead of raw IP access to meet production security standards.",
                "Maintained isolated backend and AI-service integration branches to safely merge contributions from multiple team members",
                "Consolidated all backend and AI service work into a single stable branch while keeping frontend development decoupled to avoid cross-domain conflicts"
            ]
        },
        "links": {
            "github": "https://github.com/Debug-Aryan",
            "linkedin": "https://www.linkedin.com/in/aryan-prajapati-b9b9a5284"
        }
    }
    ,
    {
        "id": 2,
        "name": "Vedant Patel",
        "role": "Backend & System Architect | Team Lead",
        "avatar": "/Vedant_Patel_Profile.png",
        "highlights": [
            "Authentication & Authorization Architecture",
            "Admin Panel System Design",
            "Team Management with Constant Inputs",
        ],
        "contributions": {
            "modules": [
                "Authentication & Authorization System",
                "Complete Admin Panel",
                "Role-Based Access Control",
                "Database Schema Design"
            ],
            "features": [
                "Built complete JWT-based authentication system using access & refresh tokens",
                "Integrated Nodemailer with live email workflows for signup, OTP verification, and password recovery",
                "Developed full admin panel allowing creation and management of teachers, principals, classrooms, and students",
                "Implemented strict role-based authorization for Admin, Teacher, and Principal",
                "Designed and structured the entire database schema for scalability and clarity",
                "Handled smooth server–client integration for reliable data flow across the application",
                "Led the team by managing full workflow, assigning tasks, and providing constant feedback and inputs"
            ],
            "techStack": [
                "Node.js",
                "Express.js",
                "MongoDB",
                "JWT (Access & Refresh Tokens)",
                "Nodemailer",
                "React",
                "REST APIs",
                "Git & GitHub"
            ],
            "decisions": [
                "Chose refresh-token-based JWT authentication for better security and session control",
                "Designed role-based middleware to centralize authorization logic",
                "Structured backend APIs to remain UI-agnostic for future frontend changes",
                "Led end-to-end repository management, aligning team contributions through structured branching, reviews, and release discipline"
            ]
        },
        "links": {
            "github": "https://github.com/vedantx001",
            "linkedin": "https://www.linkedin.com/in/vedant-patell"
        }
    },
    {
        "id": 3,
        "name": "Vraj Patel",
        "role": "Lead Frontend & Fullstack Engineer",
        "avatar": "/Vraj_Patel_profile_pic.png",
        "highlights": [
            "Luxury-grade frontend architecture with motion-first UI",
            "End-to-end attendance workflows across client and server",
            "Multi-role dashboard systems with performance-focused design"
        ],
        "contributions": {
            "modules": [
                "Teacher & Principal Dashboard System",
                "Attendance Module (Client + Server)",
                "Developer / Contributors Showcase",
                "Server APIs: Classes & Students",
                "Server Data Models: Student, Classroom"
            ],
            "features": [
                "Built a fully responsive, motion-rich landing experience with Hero, Features, and CTA sections optimized for first-time user conversion.",
                "Designed and implemented premium UI components using Framer Motion, glassmorphism patterns, and micro-interactions for a luxury feel.",
                "Developed Teacher and Principal dashboards with classroom overviews, student detail views, and role-based UI flows.",
                "Implemented a complete attendance workflow including submission, reporting, image uploads, and UI-state synchronization.",
                "Built bulk student upload functionality with Excel parsing, validation, and structured error handling.",
                "Created an interactive developer and contributors showcase enhanced with Three.js-based visual elements."
            ],
            "techStack": [
                "React",
                "JavaScript",
                "Node.js",
                "Express",
                "MongoDB",
                "Mongoose",
                "Framer Motion",
                "Three.js",
                "Tailwind CSS",
                "Cloudinary",
            ],
            "decisions": [
                "Designed a modular and reusable component architecture to scale UI features without duplication.",
                "Maintained strict client–server separation using RESTful controllers and clean API contracts.",
                "Adopted middleware-based file upload and Excel parsing to support reliable bulk student ingestion.",
                "Selected Orbitron and Exo 2 typography to establish a premium, technical, and futuristic visual identity."
            ]
        },
        "links": {
            "github": "https://github.com/VrajPatel1635",
            "linkedin": "https://www.linkedin.com/in/vraj-patel-1a28762ba/",
            "portfolio": "https://vraj-portfolio-nu.vercel.app/"
        }
    }
];

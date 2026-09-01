export type RankedCandidate = {
  id: string;
  name: string;
  email: string;
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
};

export const mockRankedCandidates: RankedCandidate[] = [
  {
    id: "c1",
    name: "Aarav Singh",
    email: "aarav.candidate@example.com",
    matchPercentage: 92,
    matchedSkills: ["React", "TypeScript", "REST", "Unit Testing"],
    missingSkills: ["Docker"]
  },
  {
    id: "c2",
    name: "Meera Sharma",
    email: "meera.candidate@example.com",
    matchPercentage: 78,
    matchedSkills: ["React", "JavaScript", "Node.js"],
    missingSkills: ["TypeScript", "SQL", "Testing"]
  },
  {
    id: "c3",
    name: "Kabir Verma",
    email: "kabir.candidate@example.com",
    matchPercentage: 64,
    matchedSkills: ["HTML", "CSS", "React"],
    missingSkills: ["TypeScript", "Node.js", "System Design"]
  }
];


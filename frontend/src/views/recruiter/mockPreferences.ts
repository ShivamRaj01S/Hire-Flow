export type CandidatePreference = {
  candidateId: string;
  candidateName: string;
  date: string; // YYYY-MM-DD
  slots: Array<{ start: string; end: string }>;
};

export const mockPreferences: CandidatePreference[] = [
  {
    candidateId: "c1",
    candidateName: "Aarav Singh",
    date: new Date().toISOString().slice(0, 10),
    slots: [
      { start: "10:00", end: "10:30" },
      { start: "14:00", end: "14:30" }
    ]
  },
  {
    candidateId: "c2",
    candidateName: "Meera Sharma",
    date: new Date().toISOString().slice(0, 10),
    slots: [
      { start: "09:00", end: "09:30" },
      { start: "10:00", end: "10:30" }
    ]
  }
];


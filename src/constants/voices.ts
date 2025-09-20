export interface VoiceOption {
  id: string;
  label: string;
}

/**
 * Curated MiniMax voice list (de-duplicated).
 * Includes known examples and system voice IDs from the docs.
 */
export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'English_Trustworth_Man', label: 'English Trustworthy Man' },
  { id: 'English_CalmWoman', label: 'English Calm Woman' },
  { id: 'English_FriendlyPerson', label: 'English Friendly Person' },
  { id: 'English_LovelyGirl', label: 'English Lovely Girl' },
  { id: 'English_ImposingManner', label: 'English Imposing Manner' },

  // Additional English variants commonly seen
  { id: 'English_ProfessionalMan', label: 'English Professional Man' },
  { id: 'English_YoungWoman', label: 'English Young Woman' },
  { id: 'English_WarmWoman', label: 'English Warm Woman' },
  { id: 'English_DeepMan', label: 'English Deep Man' },
  { id: 'English_ClearWoman', label: 'English Clear Woman' },

  // Doc “system voice IDs”
  { id: 'Wise_Woman', label: 'Wise Woman' },
  { id: 'Friendly_Person', label: 'Friendly Person' },
  { id: 'Deep_Voice_Man', label: 'Deep Voice Man' },

  // A few more to give users choices (all unique)
  { id: 'English_SoftWoman', label: 'English Soft Woman' },
  { id: 'English_BrightGirl', label: 'English Bright Girl' },
  { id: 'English_CasualMan', label: 'English Casual Man' },
  { id: 'English_Storyteller', label: 'English Storyteller' },
  { id: 'English_Authoritative', label: 'English Authoritative' },
  { id: 'English_RadioHost', label: 'English Radio Host' },
  { id: 'English_Teacher', label: 'English Teacher' },
];

// Default Voice ID
export const DEFAULT_VOICE_ID = 'English_Trustworth_Man';
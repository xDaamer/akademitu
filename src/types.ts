export interface Teacher {
  id: string;
  name: string;
  department: string;
  rank: string;
  imageUrl: string;
  branch?: string;
}

export interface LeadFormData {
  fullName: string;
  phone: string;
  examType?: 'YKS' | 'LGS' | 'Diğer';
  studentFullName?: string;
  parentFullName?: string;
  userRole?: 'Veli' | 'Öğrenci';
  gradeClass?: string;
  selectedSubjects?: string[];
  note?: string;
  created_at?: string;
  id?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

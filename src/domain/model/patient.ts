export class PatientKeyModel {
  personId: number;
  surveyId: number;
  personSurveyId: number;
}
export class PatientCreateModel extends PatientKeyModel {
  medicId: number;
  medicalSpecialtyId: number;
}

export class PatientModel extends PatientCreateModel {
  createdAt: Date;
}

export class PatientPanelModel extends PatientModel {
  personFullName: string;
  medicFullName: string;
  medicalSpecialtyName: string;
  createdAt: Date;
}

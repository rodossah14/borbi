import type { TypeEtablissement } from '../constantes/etablissements';
import type { CodePays } from '../constantes/pays';

export interface Etablissement {
  id: string;
  idProprietaire: string;
  type: TypeEtablissement;
  nom: string;
  pays: CodePays;
  ville: string;
  adresse: string | null;
  latitude: number | null;
  longitude: number | null;
  numeroNinea: string | null;   // un commerçant sans NINEA ne peut pas encaisser
  estActif: boolean;
  dateCreation: Date;
}

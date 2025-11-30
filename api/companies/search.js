const companies = [
  {
    id: 'siret-55210055400013',
    name: 'Societe Exemple',
    siren: '552100554',
    siret: '55210055400013',
    naf: '62.01Z',
    address: '12 rue du Progres',
    city: 'Paris',
    postalCode: '75000',
  },
  {
    id: 'siret-84345511100029',
    name: 'Kairos Conseil',
    siren: '843455111',
    siret: '84345511100029',
    naf: '70.22Z',
    address: '42 avenue des Lumieres',
    city: 'Lyon',
    postalCode: '69002',
  },
  {
    id: 'siret-90233477800017',
    name: 'DevFactory',
    siren: '902334778',
    siret: '90233477800017',
    naf: '62.02A',
    address: '5 quai Innovation',
    city: 'Nantes',
    postalCode: '44000',
  },
];

export default function handler(req, res) {
  const q = (req.query.q || '').toString().trim().toLowerCase();
  const result = !q
    ? []
    : companies.filter((c) => {
        const blob = `${c.name} ${c.siren} ${c.siret}`.toLowerCase();
        return blob.includes(q);
      });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).send(JSON.stringify(result, null, 2));
}

// src/lib/active-institution.ts

export function setActiveInstitutionId(id: string) {
  // Salva no localStorage para leitura rápida no client
  localStorage.setItem("active_institution_id", id);
  
  // Salva nos cookies para leitura no Next.js Server Components / Middleware
  // max-age=31536000 corresponde a 1 ano
  document.cookie = `active_institution_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
}

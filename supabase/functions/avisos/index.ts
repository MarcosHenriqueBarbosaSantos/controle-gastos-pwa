// Ponto de entrada no Supabase (Deno). Toda a lógica está em handler.js, que também roda nos testes.
import { createClient } from "npm:@supabase/supabase-js@2";
import { criaHandler } from "./handler.js";

Deno.serve(criaHandler({ createClient, env: (k: string) => Deno.env.get(k) }));

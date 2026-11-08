export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      acao_desenvolvimento: {
        Row: {
          colaborador_id: string
          competencia: string | null
          criado_em: string
          criado_por: string
          descricao: string
          empresa_id: string
          id: string
          origem: string
          prazo: string | null
          referencia_externa: string | null
          situacao_id: string | null
          status: string
        }
        Insert: {
          colaborador_id: string
          competencia?: string | null
          criado_em?: string
          criado_por?: string
          descricao: string
          empresa_id: string
          id?: string
          origem?: string
          prazo?: string | null
          referencia_externa?: string | null
          situacao_id?: string | null
          status?: string
        }
        Update: {
          colaborador_id?: string
          competencia?: string | null
          criado_em?: string
          criado_por?: string
          descricao?: string
          empresa_id?: string
          id?: string
          origem?: string
          prazo?: string | null
          referencia_externa?: string | null
          situacao_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "acao_desenvolvimento_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acao_desenvolvimento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acao_desenvolvimento_situacao_id_fkey"
            columns: ["situacao_id"]
            isOneToOne: false
            referencedRelation: "situacao"
            referencedColumns: ["id"]
          },
        ]
      }
      alcada: {
        Row: {
          ativo: boolean
          cargo_referencia: string | null
          consultar: string | null
          criado_em: string
          empresa_id: string
          id: string
          limites: string | null
          nivel: Database["public"]["Enums"]["nivel_hierarquico"] | null
          pode_decidir: string
        }
        Insert: {
          ativo?: boolean
          cargo_referencia?: string | null
          consultar?: string | null
          criado_em?: string
          empresa_id: string
          id?: string
          limites?: string | null
          nivel?: Database["public"]["Enums"]["nivel_hierarquico"] | null
          pode_decidir: string
        }
        Update: {
          ativo?: boolean
          cargo_referencia?: string | null
          consultar?: string | null
          criado_em?: string
          empresa_id?: string
          id?: string
          limites?: string | null
          nivel?: Database["public"]["Enums"]["nivel_hierarquico"] | null
          pode_decidir?: string
        }
        Relationships: [
          {
            foreignKeyName: "alcada_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          acao: string
          antes: Json | null
          ator: string | null
          depois: Json | null
          em: string
          empresa_id: string | null
          id: number
          registro_id: string | null
          tabela: string
        }
        Insert: {
          acao: string
          antes?: Json | null
          ator?: string | null
          depois?: Json | null
          em?: string
          empresa_id?: string | null
          id?: never
          registro_id?: string | null
          tabela: string
        }
        Update: {
          acao?: string
          antes?: Json | null
          ator?: string | null
          depois?: Json | null
          em?: string
          empresa_id?: string | null
          id?: never
          registro_id?: string | null
          tabela?: string
        }
        Relationships: []
      }
      boomit_snapshot: {
        Row: {
          capturado_em: string
          empresa_id: string
          entidade: string
          entidade_id: string
          execucao_id: string | null
          fonte: Database["public"]["Enums"]["fonte_snapshot"]
          hash: string
          id: string
          payload: Json
          schema_version: string
        }
        Insert: {
          capturado_em?: string
          empresa_id: string
          entidade: string
          entidade_id: string
          execucao_id?: string | null
          fonte: Database["public"]["Enums"]["fonte_snapshot"]
          hash: string
          id?: string
          payload: Json
          schema_version: string
        }
        Update: {
          capturado_em?: string
          empresa_id?: string
          entidade?: string
          entidade_id?: string
          execucao_id?: string | null
          fonte?: Database["public"]["Enums"]["fonte_snapshot"]
          hash?: string
          id?: string
          payload?: Json
          schema_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "boomit_snapshot_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boomit_snapshot_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "conector_execucao"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador: {
        Row: {
          area: string | null
          area_normalizada: string | null
          ativo: boolean
          atualizado_em: string
          boomit_colaborador_id: string | null
          cargo: string | null
          diretoria: string | null
          email: string
          empresa_id: string
          id: string
          nivel: Database["public"]["Enums"]["nivel_hierarquico"] | null
          nome: string
        }
        Insert: {
          area?: string | null
          area_normalizada?: string | null
          ativo?: boolean
          atualizado_em?: string
          boomit_colaborador_id?: string | null
          cargo?: string | null
          diretoria?: string | null
          email: string
          empresa_id: string
          id?: string
          nivel?: Database["public"]["Enums"]["nivel_hierarquico"] | null
          nome: string
        }
        Update: {
          area?: string | null
          area_normalizada?: string | null
          ativo?: boolean
          atualizado_em?: string
          boomit_colaborador_id?: string | null
          cargo?: string | null
          diretoria?: string | null
          email?: string
          empresa_id?: string
          id?: string
          nivel?: Database["public"]["Enums"]["nivel_hierarquico"] | null
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      combinado: {
        Row: {
          atualizado_em: string
          colaborador_id: string | null
          concluido_em: string | null
          criado_em: string
          criado_por: string
          descricao: string
          documento_id: string | null
          empresa_id: string
          evidencia_esperada: string | null
          evidencia_registrada: string | null
          historico: Json
          id: string
          lider_id: string
          nota_mudanca: string | null
          origem: Database["public"]["Enums"]["origem_combinado"]
          prazo: string | null
          responsavel_nome: string | null
          responsavel_tipo: string
          situacao_id: string | null
          status: Database["public"]["Enums"]["status_combinado"]
          trecho_id: string | null
        }
        Insert: {
          atualizado_em?: string
          colaborador_id?: string | null
          concluido_em?: string | null
          criado_em?: string
          criado_por?: string
          descricao: string
          documento_id?: string | null
          empresa_id: string
          evidencia_esperada?: string | null
          evidencia_registrada?: string | null
          historico?: Json
          id?: string
          lider_id: string
          nota_mudanca?: string | null
          origem: Database["public"]["Enums"]["origem_combinado"]
          prazo?: string | null
          responsavel_nome?: string | null
          responsavel_tipo: string
          situacao_id?: string | null
          status?: Database["public"]["Enums"]["status_combinado"]
          trecho_id?: string | null
        }
        Update: {
          atualizado_em?: string
          colaborador_id?: string | null
          concluido_em?: string | null
          criado_em?: string
          criado_por?: string
          descricao?: string
          documento_id?: string | null
          empresa_id?: string
          evidencia_esperada?: string | null
          evidencia_registrada?: string | null
          historico?: Json
          id?: string
          lider_id?: string
          nota_mudanca?: string | null
          origem?: Database["public"]["Enums"]["origem_combinado"]
          prazo?: string | null
          responsavel_nome?: string | null
          responsavel_tipo?: string
          situacao_id?: string | null
          status?: Database["public"]["Enums"]["status_combinado"]
          trecho_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "combinado_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combinado_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documento_fonte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combinado_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combinado_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combinado_situacao_id_fkey"
            columns: ["situacao_id"]
            isOneToOne: false
            referencedRelation: "situacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combinado_trecho_id_fkey"
            columns: ["trecho_id"]
            isOneToOne: false
            referencedRelation: "trecho"
            referencedColumns: ["id"]
          },
        ]
      }
      compromisso: {
        Row: {
          atualizado_em: string
          colaborador_id: string | null
          criado_em: string
          criado_por: string
          duracao_min: number
          empresa_id: string
          id: string
          inicio: string
          lider_id: string
          local: string | null
          observacao: string | null
          realizado_em: string | null
          relato: string | null
          situacao_id: string | null
          status: Database["public"]["Enums"]["status_compromisso"]
          tipo: Database["public"]["Enums"]["tipo_compromisso"]
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          colaborador_id?: string | null
          criado_em?: string
          criado_por?: string
          duracao_min?: number
          empresa_id: string
          id?: string
          inicio: string
          lider_id: string
          local?: string | null
          observacao?: string | null
          realizado_em?: string | null
          relato?: string | null
          situacao_id?: string | null
          status?: Database["public"]["Enums"]["status_compromisso"]
          tipo: Database["public"]["Enums"]["tipo_compromisso"]
          titulo: string
        }
        Update: {
          atualizado_em?: string
          colaborador_id?: string | null
          criado_em?: string
          criado_por?: string
          duracao_min?: number
          empresa_id?: string
          id?: string
          inicio?: string
          lider_id?: string
          local?: string | null
          observacao?: string | null
          realizado_em?: string | null
          relato?: string | null
          situacao_id?: string | null
          status?: Database["public"]["Enums"]["status_compromisso"]
          tipo?: Database["public"]["Enums"]["tipo_compromisso"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "compromisso_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compromisso_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compromisso_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compromisso_situacao_id_fkey"
            columns: ["situacao_id"]
            isOneToOne: false
            referencedRelation: "situacao"
            referencedColumns: ["id"]
          },
        ]
      }
      competencia_sinonimo: {
        Row: {
          categoria: string | null
          chave_normalizada: string
          competencia_canonica: string
        }
        Insert: {
          categoria?: string | null
          chave_normalizada: string
          competencia_canonica: string
        }
        Update: {
          categoria?: string | null
          chave_normalizada?: string
          competencia_canonica?: string
        }
        Relationships: []
      }
      config_sistema: {
        Row: {
          chave: string
          valor: string
        }
        Insert: {
          chave: string
          valor: string
        }
        Update: {
          chave?: string
          valor?: string
        }
        Relationships: []
      }
      conector_execucao: {
        Row: {
          alertas: Json
          empresa_id: string
          erro: string | null
          finalizado_em: string | null
          fonte: Database["public"]["Enums"]["fonte_snapshot"]
          id: string
          iniciado_em: string
          registros_lidos: number | null
          status: string
        }
        Insert: {
          alertas?: Json
          empresa_id: string
          erro?: string | null
          finalizado_em?: string | null
          fonte: Database["public"]["Enums"]["fonte_snapshot"]
          id?: string
          iniciado_em?: string
          registros_lidos?: number | null
          status?: string
        }
        Update: {
          alertas?: Json
          empresa_id?: string
          erro?: string | null
          finalizado_em?: string | null
          fonte?: Database["public"]["Enums"]["fonte_snapshot"]
          id?: string
          iniciado_em?: string
          registros_lidos?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conector_execucao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      contexto_colaborador: {
        Row: {
          alertas_qualidade: string[]
          atualizado_em: string
          colaborador_id: string
          dados: Json
          empresa_id: string
          snapshot_id: string | null
        }
        Insert: {
          alertas_qualidade?: string[]
          atualizado_em?: string
          colaborador_id: string
          dados: Json
          empresa_id: string
          snapshot_id?: string | null
        }
        Update: {
          alertas_qualidade?: string[]
          atualizado_em?: string
          colaborador_id?: string
          dados?: Json
          empresa_id?: string
          snapshot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contexto_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contexto_colaborador_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contexto_colaborador_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "boomit_snapshot"
            referencedColumns: ["id"]
          },
        ]
      }
      contexto_colaborador_sensivel: {
        Row: {
          atualizado_em: string
          colaborador_id: string
          dados: Json
          empresa_id: string
          snapshot_id: string | null
        }
        Insert: {
          atualizado_em?: string
          colaborador_id: string
          dados: Json
          empresa_id: string
          snapshot_id?: string | null
        }
        Update: {
          atualizado_em?: string
          colaborador_id?: string
          dados?: Json
          empresa_id?: string
          snapshot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contexto_colaborador_sensivel_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contexto_colaborador_sensivel_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contexto_colaborador_sensivel_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "boomit_snapshot"
            referencedColumns: ["id"]
          },
        ]
      }
      contexto_empresa: {
        Row: {
          alertas_qualidade: string[]
          atualizado_em: string
          dados: Json
          empresa_id: string
          snapshot_id: string | null
        }
        Insert: {
          alertas_qualidade?: string[]
          atualizado_em?: string
          dados: Json
          empresa_id: string
          snapshot_id?: string | null
        }
        Update: {
          alertas_qualidade?: string[]
          atualizado_em?: string
          dados?: Json
          empresa_id?: string
          snapshot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contexto_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contexto_empresa_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "boomit_snapshot"
            referencedColumns: ["id"]
          },
        ]
      }
      decisao: {
        Row: {
          analise: Json | null
          atualizado_em: string
          colaborador_id: string | null
          contexto: string | null
          criado_em: string
          criado_por: string
          decidida_em: string | null
          empresa_id: string
          id: string
          justificativa: string | null
          lider_id: string
          opcao_escolhida: string | null
          opcoes_iniciais: string[]
          pergunta: string
          prazo_decisao: string | null
          resultado_revisao: string | null
          revisar_em: string | null
          sensivel: boolean
          status: Database["public"]["Enums"]["status_decisao"]
          titulo: string
          versao_analise: number
        }
        Insert: {
          analise?: Json | null
          atualizado_em?: string
          colaborador_id?: string | null
          contexto?: string | null
          criado_em?: string
          criado_por?: string
          decidida_em?: string | null
          empresa_id: string
          id?: string
          justificativa?: string | null
          lider_id: string
          opcao_escolhida?: string | null
          opcoes_iniciais?: string[]
          pergunta: string
          prazo_decisao?: string | null
          resultado_revisao?: string | null
          revisar_em?: string | null
          sensivel?: boolean
          status?: Database["public"]["Enums"]["status_decisao"]
          titulo: string
          versao_analise?: number
        }
        Update: {
          analise?: Json | null
          atualizado_em?: string
          colaborador_id?: string | null
          contexto?: string | null
          criado_em?: string
          criado_por?: string
          decidida_em?: string | null
          empresa_id?: string
          id?: string
          justificativa?: string | null
          lider_id?: string
          opcao_escolhida?: string | null
          opcoes_iniciais?: string[]
          pergunta?: string
          prazo_decisao?: string | null
          resultado_revisao?: string | null
          revisar_em?: string | null
          sensivel?: boolean
          status?: Database["public"]["Enums"]["status_decisao"]
          titulo?: string
          versao_analise?: number
        }
        Relationships: [
          {
            foreignKeyName: "decisao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisao_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_colaborador: {
        Row: {
          colaborador_id: string
          confirmado: boolean
          documento_id: string
        }
        Insert: {
          colaborador_id: string
          confirmado?: boolean
          documento_id: string
        }
        Update: {
          colaborador_id?: string
          confirmado?: boolean
          documento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_colaborador_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documento_fonte"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_fonte: {
        Row: {
          criado_em: string
          data_evento: string | null
          empresa_id: string
          enviado_por: string
          erro: string | null
          formato: string | null
          id: string
          lider_id: string | null
          participantes_avisados: boolean
          status_processamento: Database["public"]["Enums"]["status_processamento"]
          storage_path: string | null
          tipo: Database["public"]["Enums"]["tipo_documento"]
          titulo: string
        }
        Insert: {
          criado_em?: string
          data_evento?: string | null
          empresa_id: string
          enviado_por?: string
          erro?: string | null
          formato?: string | null
          id?: string
          lider_id?: string | null
          participantes_avisados?: boolean
          status_processamento?: Database["public"]["Enums"]["status_processamento"]
          storage_path?: string | null
          tipo: Database["public"]["Enums"]["tipo_documento"]
          titulo: string
        }
        Update: {
          criado_em?: string
          data_evento?: string | null
          empresa_id?: string
          enviado_por?: string
          erro?: string | null
          formato?: string | null
          id?: string
          lider_id?: string | null
          participantes_avisados?: boolean
          status_processamento?: Database["public"]["Enums"]["status_processamento"]
          storage_path?: string | null
          tipo?: Database["public"]["Enums"]["tipo_documento"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_fonte_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_fonte_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
        ]
      }
      email_envio: {
        Row: {
          assunto: string
          criado_em: string
          destinatario_user_id: string
          empresa_id: string
          enviado_em: string | null
          erro: string | null
          etapa: string | null
          html: string
          id: string
          lembrete_id: string | null
          para: string
          provedor_id: string | null
          status: string
          tentativas: number
          texto: string
          tipo: string
        }
        Insert: {
          assunto: string
          criado_em?: string
          destinatario_user_id: string
          empresa_id: string
          enviado_em?: string | null
          erro?: string | null
          etapa?: string | null
          html: string
          id?: string
          lembrete_id?: string | null
          para: string
          provedor_id?: string | null
          status?: string
          tentativas?: number
          texto: string
          tipo: string
        }
        Update: {
          assunto?: string
          criado_em?: string
          destinatario_user_id?: string
          empresa_id?: string
          enviado_em?: string | null
          erro?: string | null
          etapa?: string | null
          html?: string
          id?: string
          lembrete_id?: string | null
          para?: string
          provedor_id?: string | null
          status?: string
          tentativas?: number
          texto?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_envio_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_envio_lembrete_id_fkey"
            columns: ["lembrete_id"]
            isOneToOne: false
            referencedRelation: "lembrete"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa: {
        Row: {
          boomit_empresa_id: string | null
          config: Json
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          boomit_empresa_id?: string | null
          config?: Json
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          boomit_empresa_id?: string | null
          config?: Json
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      extracao: {
        Row: {
          confianca: number | null
          conteudo: Json
          criado_em: string
          documento_id: string
          empresa_id: string
          id: string
          status_revisao: Database["public"]["Enums"]["status_revisao"]
          tipo: string
          trecho_id: string | null
        }
        Insert: {
          confianca?: number | null
          conteudo: Json
          criado_em?: string
          documento_id: string
          empresa_id: string
          id?: string
          status_revisao?: Database["public"]["Enums"]["status_revisao"]
          tipo: string
          trecho_id?: string | null
        }
        Update: {
          confianca?: number | null
          conteudo?: Json
          criado_em?: string
          documento_id?: string
          empresa_id?: string
          id?: string
          status_revisao?: Database["public"]["Enums"]["status_revisao"]
          tipo?: string
          trecho_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracao_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documento_fonte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracao_trecho_id_fkey"
            columns: ["trecho_id"]
            isOneToOne: false
            referencedRelation: "trecho"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_semanal: {
        Row: {
          conteudo: Json
          destinatario_user_id: string
          empresa_id: string
          gerado_em: string
          id: string
          lider_id: string
          modelo: string | null
          semana_inicio: string
        }
        Insert: {
          conteudo: Json
          destinatario_user_id: string
          empresa_id: string
          gerado_em?: string
          id?: string
          lider_id: string
          modelo?: string | null
          semana_inicio: string
        }
        Update: {
          conteudo?: Json
          destinatario_user_id?: string
          empresa_id?: string
          gerado_em?: string
          id?: string
          lider_id?: string
          modelo?: string | null
          semana_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_semanal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insight_semanal_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
        ]
      }
      interacao_ia: {
        Row: {
          avaliacao_lider: number | null
          criado_em: string
          custo_estimado: number | null
          empresa_id: string
          finalidade: string
          fontes_ids: string[]
          id: string
          latencia_ms: number | null
          modelo: string
          situacao_id: string | null
          skills_aplicadas: string[]
          tokens_entrada: number | null
          tokens_saida: number | null
          user_id: string
          versao_prompt: string | null
        }
        Insert: {
          avaliacao_lider?: number | null
          criado_em?: string
          custo_estimado?: number | null
          empresa_id: string
          finalidade: string
          fontes_ids?: string[]
          id?: string
          latencia_ms?: number | null
          modelo: string
          situacao_id?: string | null
          skills_aplicadas?: string[]
          tokens_entrada?: number | null
          tokens_saida?: number | null
          user_id?: string
          versao_prompt?: string | null
        }
        Update: {
          avaliacao_lider?: number | null
          criado_em?: string
          custo_estimado?: number | null
          empresa_id?: string
          finalidade?: string
          fontes_ids?: string[]
          id?: string
          latencia_ms?: number | null
          modelo?: string
          situacao_id?: string | null
          skills_aplicadas?: string[]
          tokens_entrada?: number | null
          tokens_saida?: number | null
          user_id?: string
          versao_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interacao_ia_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacao_ia_situacao_id_fkey"
            columns: ["situacao_id"]
            isOneToOne: false
            referencedRelation: "situacao"
            referencedColumns: ["id"]
          },
        ]
      }
      lembrete: {
        Row: {
          canal: string
          combinado_id: string | null
          compromisso_id: string | null
          decisao_id: string | null
          etapa: string
          destinatario_user_id: string
          empresa_id: string
          enviado_em: string | null
          enviar_em: string
          id: string
          lido_em: string | null
        }
        Insert: {
          canal?: string
          combinado_id?: string | null
          compromisso_id?: string | null
          decisao_id?: string | null
          etapa?: string
          destinatario_user_id: string
          empresa_id: string
          enviado_em?: string | null
          enviar_em: string
          id?: string
          lido_em?: string | null
        }
        Update: {
          canal?: string
          combinado_id?: string | null
          compromisso_id?: string | null
          decisao_id?: string | null
          etapa?: string
          destinatario_user_id?: string
          empresa_id?: string
          enviado_em?: string | null
          enviar_em?: string
          id?: string
          lido_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lembrete_combinado_id_fkey"
            columns: ["combinado_id"]
            isOneToOne: false
            referencedRelation: "combinado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembrete_compromisso_id_fkey"
            columns: ["compromisso_id"]
            isOneToOne: false
            referencedRelation: "compromisso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembrete_decisao_id_fkey"
            columns: ["decisao_id"]
            isOneToOne: false
            referencedRelation: "decisao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembrete_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      membro: {
        Row: {
          colaborador_id: string | null
          criado_em: string
          empresa_id: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          user_id: string
        }
        Insert: {
          colaborador_id?: string | null
          criado_em?: string
          empresa_id: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          user_id: string
        }
        Update: {
          colaborador_id?: string | null
          criado_em?: string
          empresa_id?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membro_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      mentoria: {
        Row: {
          ativo: boolean
          empresa_id: string
          id: string
          lider_id: string
          mentor_user_id: string
        }
        Insert: {
          ativo?: boolean
          empresa_id: string
          id?: string
          lider_id: string
          mentor_user_id: string
        }
        Update: {
          ativo?: boolean
          empresa_id?: string
          id?: string
          lider_id?: string
          mentor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentoria_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentoria_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
        ]
      }
      preparacao: {
        Row: {
          conteudo: Json
          criado_em: string
          criado_por: string
          empresa_id: string
          gerado_por: string
          id: string
          interacao_ia_id: string | null
          revisada: boolean
          situacao_id: string
          versao: number
        }
        Insert: {
          conteudo: Json
          criado_em?: string
          criado_por?: string
          empresa_id: string
          gerado_por: string
          id?: string
          interacao_ia_id?: string | null
          revisada?: boolean
          situacao_id: string
          versao: number
        }
        Update: {
          conteudo?: Json
          criado_em?: string
          criado_por?: string
          empresa_id?: string
          gerado_por?: string
          id?: string
          interacao_ia_id?: string | null
          revisada?: boolean
          situacao_id?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "preparacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparacao_situacao_id_fkey"
            columns: ["situacao_id"]
            isOneToOne: false
            referencedRelation: "situacao"
            referencedColumns: ["id"]
          },
        ]
      }
      registro: {
        Row: {
          autor_user_id: string
          colaborador_id: string
          criado_em: string
          data_fato: string
          empresa_id: string
          id: string
          situacao_id: string | null
          texto: string
          tipo: Database["public"]["Enums"]["tipo_registro"]
          visibilidade: Database["public"]["Enums"]["visibilidade_registro"]
        }
        Insert: {
          autor_user_id?: string
          colaborador_id: string
          criado_em?: string
          data_fato?: string
          empresa_id: string
          id?: string
          situacao_id?: string | null
          texto: string
          tipo: Database["public"]["Enums"]["tipo_registro"]
          visibilidade?: Database["public"]["Enums"]["visibilidade_registro"]
        }
        Update: {
          autor_user_id?: string
          colaborador_id?: string
          criado_em?: string
          data_fato?: string
          empresa_id?: string
          id?: string
          situacao_id?: string | null
          texto?: string
          tipo?: Database["public"]["Enums"]["tipo_registro"]
          visibilidade?: Database["public"]["Enums"]["visibilidade_registro"]
        }
        Relationships: [
          {
            foreignKeyName: "registro_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_situacao_id_fkey"
            columns: ["situacao_id"]
            isOneToOne: false
            referencedRelation: "situacao"
            referencedColumns: ["id"]
          },
        ]
      }
      simulacao: {
        Row: {
          criado_em: string
          criado_por: string
          debrief: Json | null
          empresa_id: string
          id: string
          intensidade: string
          mensagens: Json
          situacao_id: string
        }
        Insert: {
          criado_em?: string
          criado_por?: string
          debrief?: Json | null
          empresa_id: string
          id?: string
          intensidade?: string
          mensagens?: Json
          situacao_id: string
        }
        Update: {
          criado_em?: string
          criado_por?: string
          debrief?: Json | null
          empresa_id?: string
          id?: string
          intensidade?: string
          mensagens?: Json
          situacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulacao_situacao_id_fkey"
            columns: ["situacao_id"]
            isOneToOne: false
            referencedRelation: "situacao"
            referencedColumns: ["id"]
          },
        ]
      }
      situacao: {
        Row: {
          aplicada_em: string | null
          atualizado_em: string
          autor_user_id: string
          colaborador_id: string | null
          compartilhada_mentor: boolean
          criado_em: string
          data_prevista: string | null
          empresa_id: string
          frente: Database["public"]["Enums"]["frente_gestao"]
          grupo_descricao: string | null
          id: string
          lider_id: string
          relato_aplicacao: string | null
          relato_inicial: string | null
          sensivel: boolean
          status: Database["public"]["Enums"]["status_situacao"]
          tipo: Database["public"]["Enums"]["tipo_situacao"]
          titulo: string
        }
        Insert: {
          aplicada_em?: string | null
          atualizado_em?: string
          autor_user_id?: string
          colaborador_id?: string | null
          compartilhada_mentor?: boolean
          criado_em?: string
          data_prevista?: string | null
          empresa_id: string
          frente: Database["public"]["Enums"]["frente_gestao"]
          grupo_descricao?: string | null
          id?: string
          lider_id: string
          relato_aplicacao?: string | null
          relato_inicial?: string | null
          sensivel?: boolean
          status?: Database["public"]["Enums"]["status_situacao"]
          tipo: Database["public"]["Enums"]["tipo_situacao"]
          titulo: string
        }
        Update: {
          aplicada_em?: string | null
          atualizado_em?: string
          autor_user_id?: string
          colaborador_id?: string | null
          compartilhada_mentor?: boolean
          criado_em?: string
          data_prevista?: string | null
          empresa_id?: string
          frente?: Database["public"]["Enums"]["frente_gestao"]
          grupo_descricao?: string | null
          id?: string
          lider_id?: string
          relato_aplicacao?: string | null
          relato_inicial?: string | null
          sensivel?: boolean
          status?: Database["public"]["Enums"]["status_situacao"]
          tipo?: Database["public"]["Enums"]["tipo_situacao"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "situacao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "situacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "situacao_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
        ]
      }
      skill: {
        Row: {
          aprovada_por: string | null
          ativa: boolean
          autor: string | null
          criado_em: string
          descricao: string
          empresa_id: string | null
          gatilhos: Database["public"]["Enums"]["tipo_situacao"][]
          id: string
          instrucoes: string
          modo: Database["public"]["Enums"]["modo_skill"]
          nome: string
          origem: string
          slug: string
          versao: number
        }
        Insert: {
          aprovada_por?: string | null
          ativa?: boolean
          autor?: string | null
          criado_em?: string
          descricao: string
          empresa_id?: string | null
          gatilhos?: Database["public"]["Enums"]["tipo_situacao"][]
          id?: string
          instrucoes: string
          modo: Database["public"]["Enums"]["modo_skill"]
          nome: string
          origem?: string
          slug: string
          versao?: number
        }
        Update: {
          aprovada_por?: string | null
          ativa?: boolean
          autor?: string | null
          criado_em?: string
          descricao?: string
          empresa_id?: string | null
          gatilhos?: Database["public"]["Enums"]["tipo_situacao"][]
          id?: string
          instrucoes?: string
          modo?: Database["public"]["Enums"]["modo_skill"]
          nome?: string
          origem?: string
          slug?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "skill_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_conhecimento: {
        Row: {
          conteudo: string | null
          criado_em: string
          id: string
          skill_id: string
          storage_path: string | null
          titulo: string
        }
        Insert: {
          conteudo?: string | null
          criado_em?: string
          id?: string
          skill_id: string
          storage_path?: string | null
          titulo: string
        }
        Update: {
          conteudo?: string | null
          criado_em?: string
          id?: string
          skill_id?: string
          storage_path?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_conhecimento_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill"
            referencedColumns: ["id"]
          },
        ]
      }
      trecho: {
        Row: {
          busca: unknown
          documento_id: string
          empresa_id: string
          id: string
          inicio_seg: number | null
          locutor: string | null
          ordem: number
          texto: string
        }
        Insert: {
          busca?: unknown
          documento_id: string
          empresa_id: string
          id?: string
          inicio_seg?: number | null
          locutor?: string | null
          ordem: number
          texto: string
        }
        Update: {
          busca?: unknown
          documento_id?: string
          empresa_id?: string
          id?: string
          inicio_seg?: number | null
          locutor?: string | null
          ordem?: number
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "trecho_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documento_fonte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trecho_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      vinculo_lideranca: {
        Row: {
          empresa_id: string
          fim: string | null
          id: string
          inicio: string
          lider_id: string
          liderado_id: string
        }
        Insert: {
          empresa_id: string
          fim?: string | null
          id?: string
          inicio?: string
          lider_id: string
          liderado_id: string
        }
        Update: {
          empresa_id?: string
          fim?: string | null
          id?: string
          inicio?: string
          lider_id?: string
          liderado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vinculo_lideranca_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculo_lideranca_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculo_lideranca_liderado_id_fkey"
            columns: ["liderado_id"]
            isOneToOne: false
            referencedRelation: "colaborador"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      linha_do_tempo: {
        Row: {
          colaborador_id: string | null
          empresa_id: string | null
          natureza: string | null
          origem_id: string | null
          origem_tabela: string | null
          quando: string | null
          resumo: string | null
          subtipo: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      andamento_combinados_lider: {
        Args: { p_lider: string }
        Returns: {
          colaborador_nome: string
          prazo: string
          status: Database["public"]["Enums"]["status_combinado"]
          vencido: boolean
        }[]
      }
      andamento_lideranca: {
        Args: { p_empresa: string }
        Returns: {
          combinados_abertos: number
          combinados_cumpridos: number
          combinados_no_prazo_pct: number
          combinados_vencidos: number
          lider_id: string
          lider_nome: string
          situacoes_aplicadas: number
          situacoes_encaminhadas: number
          situacoes_preparadas: number
        }[]
      }
      auditoria_metadados: { Args: { j: Json }; Returns: Json }
      documento_do_caminho: { Args: { p_nome: string }; Returns: string }
      eh_admin: { Args: { p_empresa: string }; Returns: boolean }
      eh_membro: { Args: { p_empresa: string }; Returns: boolean }
      enviar_lembretes_vencidos: { Args: never; Returns: number }
      exibe_sensiveis: { Args: { p_empresa: string }; Returns: boolean }
      lidera: { Args: { p_alvo: string; p_lider: string }; Returns: boolean }
      meu_colaborador_id: { Args: { p_empresa: string }; Returns: string }
      pode_ver_colaborador: {
        Args: { p_colaborador: string }
        Returns: boolean
      }
      pode_ver_documento: { Args: { p_documento: string }; Returns: boolean }
      pode_ver_situacao: { Args: { p_situacao: string }; Returns: boolean }
      sou_mentor_de: { Args: { p_lider: string }; Returns: boolean }
      tem_papel: {
        Args: {
          p_empresa: string
          p_papeis: Database["public"]["Enums"]["papel_usuario"][]
        }
        Returns: boolean
      }
    }
    Enums: {
      status_compromisso: "agendado" | "realizado" | "cancelado"
      status_decisao: "em_analise" | "decidida" | "revisada" | "cancelada"
      tipo_compromisso: "um_a_um" | "feedback" | "pdi" | "conversa" | "reuniao_equipe" | "mentoria" | "outro"
      fonte_snapshot: "api" | "importacao_excel" | "importacao_pdf" | "mock"
      frente_gestao:
        | "desempenho"
        | "desenvolvimento"
        | "comportamento"
        | "organizacao"
        | "crises"
        | "lideranca"
      modo_skill: "lente" | "assistente" | "revisor"
      nivel_hierarquico: "operacional" | "tatico" | "estrategico"
      origem_combinado: "preparacao" | "transcricao" | "manual"
      papel_usuario: "lider" | "mentor" | "admin_empresa" | "admin_boomit"
      status_combinado:
        | "pendente_revisao"
        | "aberto"
        | "cumprido"
        | "renegociado"
        | "nao_cumprido"
        | "cancelado"
      status_processamento: "recebido" | "processando" | "processado" | "erro"
      status_revisao: "pendente" | "aprovado" | "descartado"
      status_situacao:
        | "rascunho"
        | "preparada"
        | "simulada"
        | "aplicada"
        | "em_acompanhamento"
        | "encerrada"
        | "encaminhada"
      tipo_documento:
        | "transcricao_mentoria"
        | "transcricao_reuniao"
        | "anotacao_reuniao"
        | "documento"
        | "nota"
      tipo_registro:
        | "feedback"
        | "reconhecimento"
        | "observacao"
        | "alinhamento"
        | "ocorrencia"
      tipo_situacao:
        | "feedback"
        | "pdi"
        | "conversa_dificil"
        | "decisao_alcada"
        | "preparacao_reuniao"
        | "outro"
      visibilidade_registro: "privado" | "linha_gestao"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      status_compromisso: ["agendado", "realizado", "cancelado"],
      status_decisao: ["em_analise", "decidida", "revisada", "cancelada"],
      tipo_compromisso: ["um_a_um", "feedback", "pdi", "conversa", "reuniao_equipe", "mentoria", "outro"],
      fonte_snapshot: ["api", "importacao_excel", "importacao_pdf", "mock"],
      frente_gestao: [
        "desempenho",
        "desenvolvimento",
        "comportamento",
        "organizacao",
        "crises",
        "lideranca",
      ],
      modo_skill: ["lente", "assistente", "revisor"],
      nivel_hierarquico: ["operacional", "tatico", "estrategico"],
      origem_combinado: ["preparacao", "transcricao", "manual"],
      papel_usuario: ["lider", "mentor", "admin_empresa", "admin_boomit"],
      status_combinado: [
        "pendente_revisao",
        "aberto",
        "cumprido",
        "renegociado",
        "nao_cumprido",
        "cancelado",
      ],
      status_processamento: ["recebido", "processando", "processado", "erro"],
      status_revisao: ["pendente", "aprovado", "descartado"],
      status_situacao: [
        "rascunho",
        "preparada",
        "simulada",
        "aplicada",
        "em_acompanhamento",
        "encerrada",
        "encaminhada",
      ],
      tipo_documento: [
        "transcricao_mentoria",
        "transcricao_reuniao",
        "anotacao_reuniao",
        "documento",
        "nota",
      ],
      tipo_registro: [
        "feedback",
        "reconhecimento",
        "observacao",
        "alinhamento",
        "ocorrencia",
      ],
      tipo_situacao: [
        "feedback",
        "pdi",
        "conversa_dificil",
        "decisao_alcada",
        "preparacao_reuniao",
        "outro",
      ],
      visibilidade_registro: ["privado", "linha_gestao"],
    },
  },
} as const

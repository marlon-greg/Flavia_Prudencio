CREATE TYPE "public"."perfil" AS ENUM('aluno', 'recepcao', 'dona');--> statement-breakpoint
CREATE TABLE "alunos" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"email" text,
	"plano_id" integer,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alunos_usuario_id_unique" UNIQUE("usuario_id")
);
--> statement-breakpoint
CREATE TABLE "anamneses" (
	"id" serial PRIMARY KEY NOT NULL,
	"aluno_id" integer NOT NULL,
	"respostas" jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "anamneses_aluno_id_unique" UNIQUE("aluno_id")
);
--> statement-breakpoint
CREATE TABLE "aulas" (
	"id" serial PRIMARY KEY NOT NULL,
	"horario_id" integer NOT NULL,
	"data" date NOT NULL,
	"inicio" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caixa" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"descricao" text NOT NULL,
	"categoria" text,
	"valor_centavos" integer NOT NULL,
	"data" date NOT NULL,
	"pagamento_id" integer,
	"usuario_id" integer,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "horarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"dia_semana" integer NOT NULL,
	"hora" text NOT NULL,
	"capacidade" integer DEFAULT 4 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matriculas" (
	"id" serial PRIMARY KEY NOT NULL,
	"aluno_id" integer NOT NULL,
	"horario_id" integer NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"aluno_id" integer NOT NULL,
	"referencia" text NOT NULL,
	"valor_centavos" integer NOT NULL,
	"vencimento" date NOT NULL,
	"pago_em" timestamp with time zone,
	"forma" text,
	"comprovante_nome" text,
	"comprovante_dados" text
);
--> statement-breakpoint
CREATE TABLE "planos" (
	"id" serial PRIMARY KEY NOT NULL,
	"modalidade" text NOT NULL,
	"aulas_semana" integer NOT NULL,
	"preco_centavos" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pre_matriculas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"email" text,
	"interesse" text,
	"mensagem" text,
	"atendida" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservas" (
	"id" serial PRIMARY KEY NOT NULL,
	"aula_id" integer NOT NULL,
	"aluno_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"status" text DEFAULT 'ativa' NOT NULL,
	"falta" boolean DEFAULT false NOT NULL,
	"cancelada_em" timestamp with time zone,
	"motivo" text,
	"atestado_nome" text,
	"atestado_dados" text
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"nome" text NOT NULL,
	"perfil" "perfil" NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_plano_id_planos_id_fk" FOREIGN KEY ("plano_id") REFERENCES "public"."planos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anamneses" ADD CONSTRAINT "anamneses_aluno_id_alunos_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aulas" ADD CONSTRAINT "aulas_horario_id_horarios_id_fk" FOREIGN KEY ("horario_id") REFERENCES "public"."horarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caixa" ADD CONSTRAINT "caixa_pagamento_id_pagamentos_id_fk" FOREIGN KEY ("pagamento_id") REFERENCES "public"."pagamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caixa" ADD CONSTRAINT "caixa_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_aluno_id_alunos_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_horario_id_horarios_id_fk" FOREIGN KEY ("horario_id") REFERENCES "public"."horarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_aluno_id_alunos_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_aula_id_aulas_id_fk" FOREIGN KEY ("aula_id") REFERENCES "public"."aulas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_aluno_id_alunos_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "aula_unica" ON "aulas" USING btree ("horario_id","data");--> statement-breakpoint
CREATE UNIQUE INDEX "horario_unico" ON "horarios" USING btree ("dia_semana","hora");--> statement-breakpoint
CREATE UNIQUE INDEX "pagamento_unico" ON "pagamentos" USING btree ("aluno_id","referencia");--> statement-breakpoint
CREATE UNIQUE INDEX "reserva_unica" ON "reservas" USING btree ("aula_id","aluno_id");
/**
 * Full development seed. Uses upsert throughout for idempotency.
 * ⚠️  NEVER use these credentials in production.
 */
import { PrismaClient, UserRole, CourseAssignmentType, LegalDocumentType } from "@prisma/client";
import * as argon2 from "argon2";
const prisma = new PrismaClient();
const CREDS = { masterAdmin: { email: "mateusfranco@gmail.com", name: "Mateus Franco", password: "Admin@2026!" }, adminAEmail: "admin-a@compliance.local", adminBEmail: "admin-b@compliance.local", adminPassword: "Admin@2026!", studentPassword: "Student@2026!" };
function slugify(t: string): string { return t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"").replace(/[\s_]+/g,"-").replace(/-{2,}/g,"-").replace(/^-+|-+$/g,""); }
async function up(email: string, name: string, role: UserRole, storeId: string, ph: string, cById: string) { return prisma.user.upsert({ where:{email}, create:{name,email,passwordHash:ph,role,status:"ACTIVE",storeId,createdById:cById,firstAccessCompletedAt:new Date()}, update:{} }); }
async function al(uid: string, dids: string[]) { for(const d of dids) await prisma.legalAcceptance.upsert({where:{userId_legalDocumentId:{userId:uid,legalDocumentId:d}},create:{userId:uid,legalDocumentId:d},update:{}}); }
async function main(): Promise<void> {
  console.log("\n🌱  Running full development seed…\n");
  const [terms,privacy] = await Promise.all([
    prisma.legalDocument.upsert({where:{id:"legal-terms-v1"},create:{id:"legal-terms-v1",type:LegalDocumentType.TERMS_OF_USE,title:"Termos de Uso",version:"1.0",content:"Ao utilizar esta plataforma você concorda com estes Termos. O acesso é pessoal e intransferível.",active:true,publishedAt:new Date()},update:{active:true}}),
    prisma.legalDocument.upsert({where:{id:"legal-privacy-v1"},create:{id:"legal-privacy-v1",type:LegalDocumentType.PRIVACY_POLICY,title:"Política de Privacidade",version:"1.0",content:"Coletamos dados mínimos conforme a LGPD. Não compartilhamos informações pessoais sem autorização.",active:true,publishedAt:new Date()},update:{active:true}}),
  ]);
  console.log("✅ Legal documents");
  const mh = await argon2.hash(CREDS.masterAdmin.password);
  const ma = await prisma.user.upsert({where:{email:CREDS.masterAdmin.email},create:{name:CREDS.masterAdmin.name,email:CREDS.masterAdmin.email,passwordHash:mh,role:UserRole.MASTER_ADMIN,status:"ACTIVE",firstAccessCompletedAt:new Date()},update:{}});
  await al(ma.id,[terms.id,privacy.id]);
  console.log("✅ MASTER_ADMIN:", ma.email);
  const [sA,sB] = await Promise.all([
    prisma.store.upsert({where:{code:"STORE-A"},create:{name:"Loja Centro",code:"STORE-A",city:"São Paulo",state:"SP",region:"Sudeste"},update:{}}),
    prisma.store.upsert({where:{code:"STORE-B"},create:{name:"Loja Sul",code:"STORE-B",city:"Curitiba",state:"PR",region:"Sul"},update:{}}),
  ]);
  const ah = await argon2.hash(CREDS.adminPassword);
  const [aA,aB] = await Promise.all([up(CREDS.adminAEmail,"Ana Lima",UserRole.STORE_ADMIN,sA.id,ah,ma.id), up(CREDS.adminBEmail,"Bruno Santos",UserRole.STORE_ADMIN,sB.id,ah,ma.id)]);
  await al(aA.id,[terms.id,privacy.id]); await al(aB.id,[terms.id,privacy.id]);
  const sh = await argon2.hash(CREDS.studentPassword);
  const nms = ["Carlos Alves","Diana Costa","Eduardo Ferreira","Fernanda Gomes","Gabriel Hora"];
  const stA: {id:string}[] = []; const stB: {id:string}[] = [];
  for(let i=0;i<5;i++){const a=await up(`aluno${i+1}@loja-a.local`,nms[i]!,UserRole.STUDENT,sA.id,sh,aA.id);const b=await up(`aluno${i+1}@loja-b.local`,nms[i]!,UserRole.STUDENT,sB.id,sh,aB.id);await al(a.id,[terms.id,privacy.id]);await al(b.id,[terms.id,privacy.id]);stA.push(a);stB.push(b);}
  console.log("✅ 10 students");
  const mkC = async(title:string,short:string,desc:string,min:number)=>{const slug=slugify(title);const ex=await prisma.course.findFirst({where:{slug}});if(ex)return ex;return prisma.course.create({data:{title,slug,shortDescription:short,description:desc,estimatedDurationMinutes:min,minimumPassingScore:70,maximumAttempts:3,certificateEnabled:true,status:"DRAFT",createdById:ma.id}});};
  const [c1,c2,c3] = await Promise.all([
    mkC("Compliance e Ética nos Negócios","Fundamentos de compliance e ética empresarial.","Aprenda princípios de compliance, ética nos negócios e boas práticas corporativas.",120),
    mkC("Atendimento ao Cliente de Excelência","Técnicas para experiência excepcional ao cliente.","Domine atendimento, comunicação eficaz e fidelização de clientes.",90),
    mkC("Normas de Segurança e Prevenção","Procedimentos de segurança e normas regulamentadoras.","Conheça EPIs, prevenção de acidentes e normas de segurança do trabalho.",60),
  ]);
  const addModule = async(cId:string,title:string,order:number)=>{ const ex=await prisma.courseModule.findFirst({where:{courseId:cId,order}});if(ex)return ex;return prisma.courseModule.create({data:{courseId:cId,title,order}});};
  const m1a=await addModule(c1.id,"Fundamentos do Compliance",1);const m1b=await addModule(c1.id,"Ética Empresarial",2);
  const m2=await addModule(c2.id,"Excelência no Atendimento",1);const m3=await addModule(c3.id,"Segurança no Trabalho",1);
  const addL=async(mid:string,title:string,order:number,req:boolean,txt:string)=>{const ex=await prisma.lesson.findFirst({where:{moduleId:mid,order}});if(!ex)await prisma.lesson.create({data:{moduleId:mid,title,type:"TEXT",order,required:req,textContent:txt}});};
  await addL(m1a.id,"O que é Compliance?",1,true,"Compliance é o conjunto de disciplinas para cumprir normas legais, regulamentares e políticas da organização.");
  await addL(m1a.id,"Normas Regulatórias",2,true,"LGPD (13.709/2018), Lei Anticorrupção (12.846/2013) e Código de Ética são pilares do compliance empresarial.");
  await addL(m1b.id,"Código de Conduta",1,true,"O Código de Conduta define valores e padrões comportamentais esperados de todos os colaboradores.");
  await addL(m1b.id,"Como Reportar Violações",2,false,"Use o Canal de Denúncias ou RH. Todas as denúncias são tratadas com confidencialidade.");
  await addL(m2.id,"Pilares do Atendimento",1,true,"Empatia, escuta ativa, agilidade, conhecimento do produto e follow-up são pilares da excelência.");
  await addL(m2.id,"Comunicação Eficaz",2,true,"Clareza, objetividade e adaptação de linguagem ao perfil do cliente são essenciais.");
  await addL(m3.id,"EPIs Obrigatórios",1,true,"Conforme NR-6: capacete, luvas, óculos e calçados de segurança quando aplicável.");
  await addL(m3.id,"Prevenção de Acidentes",2,true,"Identificação de riscos, treinamento e manutenção de equipamentos previnem acidentes.");
  console.log("✅ Courses + content");
  let quiz = await prisma.quiz.findFirst({where:{courseId:c1.id}});
  if(!quiz){quiz=await prisma.quiz.create({data:{courseId:c1.id,title:"Avaliação Final — Compliance",minimumPassingScore:70,maximumAttempts:3,shuffleQuestions:true,shuffleAnswers:true,active:true}});const q1=await prisma.question.create({data:{quizId:quiz.id,statement:"O que significa LGPD?",type:"SINGLE_CHOICE",order:1,explanation:"Lei Geral de Proteção de Dados, 13.709/2018."}});await prisma.questionOption.createMany({data:[{questionId:q1.id,text:"Lei Geral de Proteção de Dados",isCorrect:true,order:1},{questionId:q1.id,text:"Lei Geral de Privacidade Digital",isCorrect:false,order:2},{questionId:q1.id,text:"Lei Geral de Processos Digitais",isCorrect:false,order:3}]});const q2=await prisma.question.create({data:{quizId:quiz.id,statement:"O Código de Conduta guia decisões éticas?",type:"TRUE_FALSE",order:2}});await prisma.questionOption.createMany({data:[{questionId:q2.id,text:"Verdadeiro",isCorrect:true,order:1},{questionId:q2.id,text:"Falso",isCorrect:false,order:2}]});}
  console.log("✅ Quiz");
  const ua=(cId:string,stId:string,at:CourseAssignmentType)=>prisma.courseStoreAccess.upsert({where:{courseId_storeId:{courseId:cId,storeId:stId}},create:{courseId:cId,storeId:stId,assignmentType:at,active:true},update:{}});
  await Promise.all([ua(c1.id,sA.id,CourseAssignmentType.OPTIONAL),ua(c1.id,sB.id,CourseAssignmentType.OPTIONAL),ua(c2.id,sA.id,CourseAssignmentType.REQUIRED),ua(c3.id,sB.id,CourseAssignmentType.REQUIRED)]);
  await prisma.course.updateMany({where:{id:{in:[c1.id,c2.id,c3.id]}},data:{status:"PUBLISHED",publishedAt:new Date()}});
  console.log("✅ Access + published");
  const mkComp=async(uid:string,cId:string,qId:string)=>{const e=await prisma.enrollment.upsert({where:{userId_courseId:{userId:uid,courseId:cId}},create:{userId:uid,courseId:cId,status:"COMPLETED",progressPercentage:100,startedAt:new Date(Date.now()-7*86400000),completedAt:new Date(Date.now()-86400000),lastAccessedAt:new Date(Date.now()-86400000)},update:{}});const ls=await prisma.lesson.findMany({where:{module:{courseId:cId},required:true}});for(const l of ls)await prisma.lessonProgress.upsert({where:{enrollmentId_lessonId:{enrollmentId:e.id,lessonId:l.id}},create:{enrollmentId:e.id,lessonId:l.id,startedAt:new Date(Date.now()-5*86400000),completedAt:new Date(Date.now()-2*86400000)},update:{}});if(!(await prisma.quizAttempt.findFirst({where:{enrollmentId:e.id}}))){const at=await prisma.quizAttempt.create({data:{quizId:qId,enrollmentId:e.id,attemptNumber:1,status:"PASSED",score:100,passed:true,startedAt:new Date(Date.now()-86400000),submittedAt:new Date(Date.now()-86400000)}});const qs=await prisma.question.findMany({where:{quizId:qId},include:{options:true}});for(const q of qs){const co=q.options.find(o=>o.isCorrect);if(co){const a=await prisma.quizAnswer.create({data:{quizAttemptId:at.id,questionId:q.id,correct:true}});await prisma.quizAnswer.update({where:{id:a.id},data:{selectedOptions:{connect:{id:co.id}}}});}}}const code=`CERT-SEED-${uid.slice(0,6).toUpperCase()}`;await prisma.certificate.upsert({where:{enrollmentId:e.id},create:{enrollmentId:e.id,userId:uid,courseId:cId,certificateCode:code,issuedAt:new Date(Date.now()-86400000)},update:{}});};
  const mkCompNoQ=async(uid:string,cId:string)=>{const e=await prisma.enrollment.upsert({where:{userId_courseId:{userId:uid,courseId:cId}},create:{userId:uid,courseId:cId,status:"COMPLETED",progressPercentage:100,startedAt:new Date(Date.now()-3*86400000),completedAt:new Date(),lastAccessedAt:new Date()},update:{}});const ls=await prisma.lesson.findMany({where:{module:{courseId:cId},required:true}});for(const l of ls)await prisma.lessonProgress.upsert({where:{enrollmentId_lessonId:{enrollmentId:e.id,lessonId:l.id}},create:{enrollmentId:e.id,lessonId:l.id,startedAt:new Date(Date.now()-2*86400000),completedAt:new Date()},update:{}});const code=`CERT-SEED-B-${uid.slice(0,6).toUpperCase()}`;await prisma.certificate.upsert({where:{enrollmentId:e.id},create:{enrollmentId:e.id,userId:uid,courseId:cId,certificateCode:code,issuedAt:new Date()},update:{}});};
  const mkProg=async(uid:string,cId:string,n:number)=>{const ls=await prisma.lesson.findMany({where:{module:{courseId:cId},required:true},orderBy:{order:"asc"}});const pct=ls.length>0?Math.round((n/ls.length)*100):0;const e=await prisma.enrollment.upsert({where:{userId_courseId:{userId:uid,courseId:cId}},create:{userId:uid,courseId:cId,status:"IN_PROGRESS",progressPercentage:pct,startedAt:new Date(Date.now()-86400000),lastAccessedAt:new Date()},update:{}});for(let i=0;i<Math.min(n,ls.length);i++)await prisma.lessonProgress.upsert({where:{enrollmentId_lessonId:{enrollmentId:e.id,lessonId:ls[i]!.id}},create:{enrollmentId:e.id,lessonId:ls[i]!.id,startedAt:new Date(Date.now()-3600000*(i+2)),completedAt:new Date(Date.now()-3600000*(i+1))},update:{}});};
  await mkComp(stA[0]!.id,c1.id,quiz.id);
  await mkProg(stA[1]!.id,c1.id,1);
  await prisma.enrollment.upsert({where:{userId_courseId:{userId:stA[2]!.id,courseId:c1.id}},create:{userId:stA[2]!.id,courseId:c1.id,status:"NOT_STARTED"},update:{}});
  await mkCompNoQ(stB[0]!.id,c3.id);
  await mkProg(stB[1]!.id,c3.id,1);
  console.log("✅ Sample enrollments");
  const tr=await prisma.trail.upsert({where:{slug:"trilha-compliance-essencial"},create:{title:"Trilha Compliance Essencial",slug:"trilha-compliance-essencial",description:"Percurso completo cobrindo ética, atendimento e segurança.",active:true,createdById:ma.id},update:{}});
  await prisma.trailCourse.upsert({where:{trailId_courseId:{trailId:tr.id,courseId:c1.id}},create:{trailId:tr.id,courseId:c1.id,order:1},update:{}});
  await prisma.trailCourse.upsert({where:{trailId_courseId:{trailId:tr.id,courseId:c3.id}},create:{trailId:tr.id,courseId:c3.id,order:2},update:{}});
  if(!(await prisma.announcement.findFirst({where:{title:"Bem-vindos à Plataforma"}})))await prisma.announcement.create({data:{title:"Bem-vindos à Plataforma de Treinamentos",content:"Nossa plataforma está disponível! Complete os cursos obrigatórios e evolua sua carreira.",active:true,createdById:ma.id}});
  console.log("✅ Trail + announcement");
  console.log("\n┌──────────────────────────────────────────────────────┐");
  console.log("│  Credenciais de desenvolvimento                      │");
  console.log("├──────────────────────────────────────────────────────┤");
  console.log("│  MASTER_ADMIN   mateusfranco@gmail.com  Admin@2026!  │");
  console.log("│  STORE_ADMIN A  admin-a@compliance.local Admin@2026! │");
  console.log("│  STORE_ADMIN B  admin-b@compliance.local Admin@2026! │");
  console.log("│  Students       aluno1-5@loja-a.local   Student@2026!│");
  console.log("│  Students       aluno1-5@loja-b.local   Student@2026!│");
  console.log("└──────────────────────────────────────────────────────┘\n");
  console.log("✅  Seed completed.\n");
}
main().catch((e:unknown)=>{console.error("Seed failed:",e);process.exit(1);}).finally(()=>{void prisma.$disconnect();});

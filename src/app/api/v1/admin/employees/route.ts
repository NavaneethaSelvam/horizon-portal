import {NextRequest,NextResponse} from "next/server";
import {Prisma} from "@prisma/client";
import {getUser,prisma,unauthorized,forbidden} from "@/lib/server";
import {isIsoDate} from "@/lib/phase2-rules";
const admin=(role:string)=>["ADMIN","HR"].includes(role);
export async function GET(request:NextRequest){
 const user=await getUser(request);if(!user)return unauthorized();if(!admin(user.role))return forbidden();
 const p=new URL(request.url).searchParams,search=(p.get("search")??"").trim().slice(0,100),department=(p.get("department")??"").trim(),pageValue=Number(p.get("page")||1),limitValue=Number(p.get("limit")||20),page=Number.isInteger(pageValue)&&pageValue>0?pageValue:1,limit=Number.isInteger(limitValue)&&limitValue>0?Math.min(100,limitValue):20;
 const sortNames=["employee_id","full_name","work_email","department_id","hire_date","is_active"] as const;
 const sort=sortNames.includes(p.get("sort") as typeof sortNames[number])?p.get("sort") as typeof sortNames[number]:"employee_id";
 const direction=p.get("direction")==="desc"?"desc":"asc";
 const where={...(department?{department_id:department}:{}),...(search?{OR:[{employee_id:{contains:search}},{full_name:{contains:search}},{work_email:{contains:search}}]}:{})};
 const orderBy:Prisma.EmployeeOrderByWithRelationInput=sort==="department_id"?{department:{department_name:direction}}:{[sort]:direction};
 const [data,total,departments,roles,managers]=await Promise.all([prisma.employee.findMany({where,skip:(page-1)*limit,take:limit,orderBy,include:{department:true,role:true}}),prisma.employee.count({where}),prisma.department.findMany({orderBy:{department_name:"asc"}}),prisma.role.findMany({orderBy:{role_title:"asc"}}),prisma.employee.findMany({where:{is_active:true},orderBy:{full_name:"asc"},select:{employee_id:true,full_name:true}})]);
 return NextResponse.json({success:true,data,total,page,limit,departments,roles,managers});
}
export async function POST(request:NextRequest){
 const actor=await getUser(request);if(!actor)return unauthorized();if(!admin(actor.role))return forbidden();
 const b=await request.json().catch(()=>null);if(typeof b?.employee_id!=="string"||typeof b?.full_name!=="string"||typeof b?.work_email!=="string"||!b.employee_id.trim()||b.employee_id.length>100||!b.full_name.trim()||b.full_name.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.work_email)||b.work_email.length>254)return NextResponse.json({success:false,message:"Valid employee ID, name and work email are required."},{status:400});
 const optional=(key:string,max:number)=>{const v=b[key];if(v===undefined||v===null||v==="")return null;if(typeof v!=="string"||v.length>max)throw new Error("VALIDATION");return v.trim();};
 let department_id:string|null,role_id:string|null,manager_id:string|null,work_location:string|null,work_mode:string|null,employment_type:string|null,hire_date:string|null;
 try{department_id=optional("department_id",100);role_id=optional("role_id",100);manager_id=optional("manager_id",100);work_location=optional("work_location",100);work_mode=optional("work_mode",100);employment_type=optional("employment_type",100);hire_date=optional("hire_date",10);if(hire_date&&!isIsoDate(hire_date))throw new Error("VALIDATION");}catch{return NextResponse.json({success:false,message:"One or more optional fields are invalid."},{status:400});}
 if(manager_id===b.employee_id.trim())return NextResponse.json({success:false,message:"An employee cannot manage themselves."},{status:400});
 const [department,role,manager]=await Promise.all([department_id?prisma.department.findUnique({where:{department_id}}):null,role_id?prisma.role.findUnique({where:{role_id}}):null,manager_id?prisma.employee.findUnique({where:{employee_id:manager_id}}):null]);
 if(department_id&&!department||role_id&&!role||manager_id&&!manager)return NextResponse.json({success:false,message:"Department, role or manager reference does not exist."},{status:400});
 try{const created=await prisma.$transaction(async tx=>{const row=await tx.employee.create({data:{employee_id:b.employee_id.trim(),full_name:b.full_name.trim(),work_email:b.work_email.trim().toLowerCase(),department_id,role_id,manager_id,work_location,work_mode,employment_type,hire_date}});await tx.auditLog.create({data:{audit_id:crypto.randomUUID(),actor_id:actor.employeeId,action:"CREATE",employee_id:row.employee_id,changed_field:"*",new_value:JSON.stringify({full_name:row.full_name,work_email:row.work_email,department_id,role_id,manager_id,work_location,work_mode,employment_type,hire_date}),created_at:new Date().toISOString()}});return row;});return NextResponse.json({success:true,data:created},{status:201});}catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")return NextResponse.json({success:false,message:"Employee ID or work email is already in use."},{status:409});console.error("POST /api/v1/admin/employees failed:",error);return NextResponse.json({success:false,message:"Unable to create employee."},{status:500});}
}

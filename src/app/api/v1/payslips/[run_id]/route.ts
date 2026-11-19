import {NextRequest,NextResponse}from"next/server";
import {getUser,prisma,unauthorized,forbidden}from"@/lib/server";
import { idSchema, validationError } from "@/lib/validation";
export async function GET(request:NextRequest,{params}:{params:Promise<{run_id:string}>}){
 const user=await getUser(request);if(!user)return unauthorized();const {run_id}=await params;if(!idSchema.safeParse(run_id).success)return validationError("Invalid payroll run ID.");
 const slip=await prisma.payslip.findFirst({where:{run_id,employee_id:user.employeeId},include:{payroll_run:true}});
 if(!slip){const other=await prisma.payslip.findFirst({where:{run_id}});return other?forbidden():NextResponse.json({success:false,message:"Payslip not found."},{status:404});}
 return NextResponse.json({success:true,data:slip});
}

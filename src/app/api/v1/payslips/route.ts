import {NextRequest,NextResponse} from "next/server";
import {getUser,prisma,unauthorized,forbidden} from "@/lib/server";
export async function GET(request:NextRequest){
 const user=await getUser(request);if(!user)return unauthorized();
 const params=new URL(request.url).searchParams;const target=params.get("employee_id");
 if(target&&target!==user.employeeId&&!['ADMIN','HR'].includes(user.role))return forbidden();
 const payslips=await prisma.payslip.findMany({where:{employee_id:target??user.employeeId},include:{payroll_run:true},orderBy:{period_start:"desc"}});
 return NextResponse.json({success:true,data:payslips});
}

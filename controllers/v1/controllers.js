

export async function DoSomething(req, res){
    return  res.status(200).json({success:true, data:["something has been done"]})
}
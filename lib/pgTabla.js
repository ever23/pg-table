const dbTabla=require("dbtabla")
const pgResult=require("./pgResult")
class pgTabla extends dbTabla
{
    _formatResult(result)
    {
        return new pgResult(this,result)
    }
}
module.exports=pgTabla

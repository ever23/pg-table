const { dbResult, dbRow } = require("dbtabla")
class pgResult extends dbResult
{
    constructor(dbTabla,result)
    {
        let data=[]
        //console.log('forEach')
        result.rows.forEach((d,i)=>
        {
            data[i]=new dbRow(dbTabla,d)
        })
        //console.log('d', data)
        super(dbTabla,data)
        for(let i in result)
        {
            if(result[i]!=="rows")
            {
                Object.defineProperty(this, i, {
                    configurable : true,
                    enumerable   : false,
                    value        : result[i],
                })
            }
        }
    }
}
module.exports=pgResult

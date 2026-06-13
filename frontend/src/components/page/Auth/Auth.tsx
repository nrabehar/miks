
export interface AuthProps
{
	page: string;
}

export const Auth = ({ page }: AuthProps) => {
  return (
	<div>Auth {page}</div>
  )
}

export interface MessageResponse {
	message: string
}

export interface ApiError {
	message: string
	statusCode: number
	error?: string
}

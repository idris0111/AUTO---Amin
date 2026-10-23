export interface ReviewRead {
  id: string
  product_id: string
  rating: number
  text: string
  status: string
  is_verified_purchase: boolean
  created_at: string
  author_name: string
}
